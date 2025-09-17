// src/controllers/admin/replaysAdminController.ts
import { Request, Response } from "express";
import { prisma } from "../../utils/prisma";
import { z } from "zod";

/* ============================================================================
 * VALIDATION
 * ========================================================================== */
const IdSchema = z.string().min(1, "id requis");
const BulkSchema = z.object({ ids: z.array(z.string().min(1)).min(1) });

const ListQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  projectId: z.string().optional(),
  userId: z.string().optional(),
  status: z.enum(["ACTIVE", "COMPLETED", "DELETED"]).optional(),
  since: z.coerce.date().optional(),
  until: z.coerce.date().optional(),
  sort: z.enum(["createdAt:desc", "createdAt:asc"]).default("createdAt:desc"),
});

/* ============================================================================
 * HELPERS
 * ========================================================================== */
function ensureAdmin(req: Request) {
  const role = (req as any)?.user?.role;
  if (role !== "ADMIN") {
    const err: any = new Error("Forbidden");
    err.status = 403;
    throw err;
  }
}
async function auditLog(userId: string, action: string, metadata: any = {}) {
  try {
    await prisma.auditLog.create({ data: { userId, action, metadata } });
  } catch {
    /* ignore */
  }
}

/* ============================================================================
 * CONTROLLERS
 * ========================================================================== */

// 📋 Liste des sessions avec pagination + filtres
export async function listReplaySessions(req: Request, res: Response) {
  try {
    ensureAdmin(req);
    const q = ListQuerySchema.parse(req.query);
    const { page, pageSize, projectId, userId, status, since, until, sort } = q;

    const where: any = {};
    if (projectId) where.projectId = projectId;
    if (userId) where.userId = userId;
    if (status) where.status = status;
    if (since || until) {
      where.createdAt = {};
      if (since) where.createdAt.gte = since;
      if (until) where.createdAt.lte = until;
    }

    const [field, dir] = sort.split(":") as ["createdAt", "asc" | "desc"];
    const orderBy: any = { [field]: dir };

    const [total, sessions] = await Promise.all([
      prisma.replaySession.count({ where }),
      prisma.replaySession.findMany({
        where,
        include: {
          project: { select: { id: true, name: true } },
          user: { select: { id: true, email: true } },
        },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    res.json({ success: true, data: sessions, pagination: { total, page, pageSize } });
  } catch (err) {
    console.error("❌ listReplaySessions error:", err);
    res.status(500).json({ success: false, message: "Erreur récupération sessions replay" });
  }
}

// 🔎 Détail d’une session de replay
export async function getReplayById(req: Request, res: Response) {
  try {
    ensureAdmin(req);
    const { id } = IdSchema.parse(req.params.id);

    const session = await prisma.replaySession.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        user: { select: { id: true, email: true } },
        steps: true,
      },
    });
    if (!session) return res.status(404).json({ success: false, message: "Replay introuvable" });

    res.json({ success: true, data: session });
  } catch (err: any) {
    console.error("❌ getReplayById error:", err);
    res.status(500).json({ success: false, message: "Erreur récupération replay" });
  }
}

// 🗑️ Suppression (soft delete)
export async function deleteReplay(req: Request, res: Response) {
  try {
    ensureAdmin(req);
    const { id } = IdSchema.parse(req.params.id);

    await prisma.replaySession.update({ where: { id }, data: { status: "DELETED", deletedAt: new Date() } });
    await auditLog((req as any).user?.id, "ADMIN_REPLAY_DELETE", { replayId: id });

    res.json({ success: true, message: `Replay ${id} archivé` });
  } catch (err: any) {
    console.error("❌ deleteReplay error:", err);
    res.status(500).json({ success: false, message: "Erreur suppression replay" });
  }
}

// 🔙 Restaurer un replay supprimé
export async function restoreReplay(req: Request, res: Response) {
  try {
    ensureAdmin(req);
    const { id } = IdSchema.parse(req.params.id);

    const restored = await prisma.replaySession.update({
      where: { id },
      data: { status: "COMPLETED", deletedAt: null },
    });
    await auditLog((req as any).user?.id, "ADMIN_REPLAY_RESTORE", { replayId: id });

    res.json({ success: true, data: restored });
  } catch (err) {
    console.error("❌ restoreReplay error:", err);
    res.status(500).json({ success: false, message: "Erreur restauration replay" });
  }
}

// 📊 Stats enrichies
export async function replayStats(req: Request, res: Response) {
  try {
    ensureAdmin(req);

    const [totalSessions, completed, active, deleted, byProject, byUser, last24h] =
      await Promise.all([
        prisma.replaySession.count(),
        prisma.replaySession.count({ where: { status: "COMPLETED" } }),
        prisma.replaySession.count({ where: { status: "ACTIVE" } }),
        prisma.replaySession.count({ where: { status: "DELETED" } }),
        prisma.replaySession.groupBy({ by: ["projectId"], _count: { projectId: true } }),
        prisma.replaySession.groupBy({ by: ["userId"], _count: { userId: true } }),
        prisma.replaySession.count({
          where: { createdAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) } },
        }),
      ]);

    res.json({
      success: true,
      data: {
        totalSessions,
        completed,
        active,
        deleted,
        sessionsByProject: byProject,
        sessionsByUser: byUser,
        sessionsLast24h: last24h,
      },
    });
  } catch (err) {
    console.error("❌ replayStats error:", err);
    res.status(500).json({ success: false, message: "Erreur récupération stats replays" });
  }
}

// 📤 Export replays (json / csv / md)
export async function exportReplays(req: Request, res: Response) {
  try {
    ensureAdmin(req);
    const format = (req.query.format as string) || "json";
    const sessions = await prisma.replaySession.findMany({
      include: { project: true, user: true },
      orderBy: { createdAt: "desc" },
    });

    if (format === "json") return res.json({ success: true, data: sessions });
    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv");
      res.send(
        sessions.map(s => `${s.id},${s.projectId},${s.userId},${s.status},${s.createdAt}`).join("\n")
      );
      return;
    }
    if (format === "md") {
      res.type("markdown").send(
        sessions.map(s => `- Replay ${s.id} (${s.status}) - Project: ${s.projectId}`).join("\n")
      );
      return;
    }
    res.status(400).json({ success: false, message: "Format non supporté" });
  } catch (err) {
    console.error("❌ exportReplays error:", err);
    res.status(500).json({ success: false, message: "Erreur export replays" });
  }
}

// 🛠️ Bulk delete / restore
export async function bulkDeleteReplays(req: Request, res: Response) {
  try {
    ensureAdmin(req);
    const { ids } = BulkSchema.parse(req.body);

    const result = await prisma.replaySession.updateMany({
      where: { id: { in: ids } },
      data: { status: "DELETED", deletedAt: new Date() },
    });
    await auditLog((req as any).user?.id, "ADMIN_REPLAY_BULK_DELETE", { ids });

    res.json({ success: true, count: result.count });
  } catch (err) {
    console.error("❌ bulkDeleteReplays error:", err);
    res.status(500).json({ success: false, message: "Erreur bulk delete" });
  }
}

export async function bulkRestoreReplays(req: Request, res: Response) {
  try {
    ensureAdmin(req);
    const { ids } = BulkSchema.parse(req.body);

    const result = await prisma.replaySession.updateMany({
      where: { id: { in: ids } },
      data: { status: "COMPLETED", deletedAt: null },
    });
    await auditLog((req as any).user?.id, "ADMIN_REPLAY_BULK_RESTORE", { ids });

    res.json({ success: true, count: result.count });
  } catch (err) {
    console.error("❌ bulkRestoreReplays error:", err);
    res.status(500).json({ success: false, message: "Erreur bulk restore" });
  }
}
