// src/controllers/admin/projectsAdminController.ts
import { Request, Response } from "express";
import { prisma } from "../../utils/prisma";
import { z } from "zod";

/* ============================================================================
 * VALIDATION
 * ========================================================================== */
const IdSchema = z.string().min(1, "id requis");
const ValidateSchema = z.object({ validated: z.boolean() });
const BulkSchema = z.object({ ids: z.array(z.string().min(1)).min(1) });

const ListQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  ownerId: z.string().optional(),
  validated: z.coerce.boolean().optional(),
  published: z.coerce.boolean().optional(),
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

// 📋 Liste des projets avec pagination + filtres
export async function listProjects(req: Request, res: Response) {
  try {
    ensureAdmin(req);
    const q = ListQuerySchema.parse(req.query);
    const { page, pageSize, ownerId, validated, published, since, until, sort } = q;

    const where: any = {};
    if (ownerId) where.ownerId = ownerId;
    if (validated !== undefined) where.validated = validated;
    if (published !== undefined) where.published = published;
    if (since || until) {
      where.createdAt = {};
      if (since) where.createdAt.gte = since;
      if (until) where.createdAt.lte = until;
    }

    const [field, dir] = sort.split(":") as ["createdAt", "asc" | "desc"];
    const orderBy: any = { [field]: dir };

    const [total, projects] = await Promise.all([
      prisma.project.count({ where }),
      prisma.project.findMany({
        where,
        include: {
          owner: { select: { id: true, email: true } },
          _count: { select: { pages: true } },
        },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    res.json({ success: true, data: projects, pagination: { total, page, pageSize } });
  } catch (err) {
    console.error("❌ listProjects error:", err);
    res.status(500).json({ success: false, message: "Erreur récupération projets" });
  }
}

// 🔎 Détail d’un projet
export async function getProjectById(req: Request, res: Response) {
  try {
    ensureAdmin(req);
    const { id } = IdSchema.parse(req.params.id);

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, email: true } },
        pages: { select: { id: true, name: true, type: true, createdAt: true } },
      },
    });
    if (!project) return res.status(404).json({ success: false, message: "Projet introuvable" });

    await auditLog((req as any).user?.id, "ADMIN_PROJECT_VIEW", { projectId: id });

    res.json({ success: true, data: project });
  } catch (err: any) {
    console.error("❌ getProjectById error:", err);
    res.status(500).json({ success: false, message: "Erreur récupération projet" });
  }
}

// 🗑️ Suppression (soft delete)
export async function deleteProject(req: Request, res: Response) {
  try {
    ensureAdmin(req);
    const { id } = IdSchema.parse(req.params.id);

    const project = await prisma.project.update({
      where: { id },
      data: { deletedAt: new Date(), status: "ARCHIVED" },
    });

    await auditLog((req as any).user?.id, "ADMIN_PROJECT_DELETE", { projectId: id });

    res.json({ success: true, message: `Projet ${id} archivé`, data: project });
  } catch (err: any) {
    console.error("❌ deleteProject error:", err);
    res.status(500).json({ success: false, message: "Erreur suppression projet" });
  }
}

// 🔙 Restaurer un projet
export async function restoreProject(req: Request, res: Response) {
  try {
    ensureAdmin(req);
    const { id } = IdSchema.parse(req.params.id);

    const restored = await prisma.project.update({
      where: { id },
      data: { deletedAt: null, status: "DRAFT" },
    });

    await auditLog((req as any).user?.id, "ADMIN_PROJECT_RESTORE", { projectId: id });

    res.json({ success: true, data: restored });
  } catch (err) {
    console.error("❌ restoreProject error:", err);
    res.status(500).json({ success: false, message: "Erreur restauration projet" });
  }
}

// ✅ Validation
export async function validateProject(req: Request, res: Response) {
  try {
    ensureAdmin(req);
    const { id } = IdSchema.parse(req.params.id);
    const { validated } = ValidateSchema.parse(req.body);

    const project = await prisma.project.update({
      where: { id },
      data: { validated },
    });

    await auditLog((req as any).user?.id, "ADMIN_PROJECT_VALIDATE", { projectId: id, validated });

    res.json({ success: true, data: project });
  } catch (err: any) {
    console.error("❌ validateProject error:", err);
    res.status(500).json({ success: false, message: "Erreur validation projet" });
  }
}

// 📤 Export projets (json / csv / md)
export async function exportProjects(req: Request, res: Response) {
  try {
    ensureAdmin(req);
    const format = (req.query.format as string) || "json";
    const projects = await prisma.project.findMany({
      include: { owner: true },
      orderBy: { createdAt: "desc" },
    });

    if (format === "json") return res.json({ success: true, data: projects });
    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv");
      res.send(
        projects.map(p => `${p.id},${p.name},${p.ownerId},${p.status},${p.createdAt}`).join("\n")
      );
      return;
    }
    if (format === "md") {
      res.type("markdown").send(
        projects.map(p => `- **${p.name}** (id: ${p.id}, status: ${p.status})`).join("\n")
      );
      return;
    }
    res.status(400).json({ success: false, message: "Format non supporté" });
  } catch (err) {
    console.error("❌ exportProjects error:", err);
    res.status(500).json({ success: false, message: "Erreur export projets" });
  }
}

// 📊 Stats enrichies
export async function projectStats(req: Request, res: Response) {
  try {
    ensureAdmin(req);

    const [total, validated, published, archived, byOwner, last7d] = await Promise.all([
      prisma.project.count(),
      prisma.project.count({ where: { validated: true } }),
      prisma.project.count({ where: { published: true } }),
      prisma.project.count({ where: { status: "ARCHIVED" } }),
      prisma.project.groupBy({ by: ["ownerId"], _count: { ownerId: true } }),
      prisma.project.count({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) } },
      }),
    ]);

    res.json({
      success: true,
      data: {
        total,
        validated,
        published,
        archived,
        byOwner,
        newLast7d: last7d,
      },
    });
  } catch (err) {
    console.error("❌ projectStats error:", err);
    res.status(500).json({ success: false, message: "Erreur récupération stats projets" });
  }
}

// 🛠️ Bulk delete / restore
export async function bulkDeleteProjects(req: Request, res: Response) {
  try {
    ensureAdmin(req);
    const { ids } = BulkSchema.parse(req.body);

    const result = await prisma.project.updateMany({
      where: { id: { in: ids } },
      data: { deletedAt: new Date(), status: "ARCHIVED" },
    });

    await auditLog((req as any).user?.id, "ADMIN_PROJECT_BULK_DELETE", { ids });

    res.json({ success: true, count: result.count });
  } catch (err) {
    console.error("❌ bulkDeleteProjects error:", err);
    res.status(500).json({ success: false, message: "Erreur bulk delete" });
  }
}

export async function bulkRestoreProjects(req: Request, res: Response) {
  try {
    ensureAdmin(req);
    const { ids } = BulkSchema.parse(req.body);

    const result = await prisma.project.updateMany({
      where: { id: { in: ids } },
      data: { deletedAt: null, status: "DRAFT" },
    });

    await auditLog((req as any).user?.id, "ADMIN_PROJECT_BULK_RESTORE", { ids });

    res.json({ success: true, count: result.count });
  } catch (err) {
    console.error("❌ bulkRestoreProjects error:", err);
    res.status(500).json({ success: false, message: "Erreur bulk restore" });
  }
}
