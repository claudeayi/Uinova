// src/controllers/admin/replaysAdminController.ts
import { Request, Response } from "express";
import { prisma } from "../../utils/prisma";
import { z } from "zod";

/* ============================================================================
 * VALIDATION
 * ========================================================================== */
const IdSchema = z.string().min(1, "id requis");

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
  } catch (err) {
    console.warn("⚠️ auditLog failed:", err);
  }
}

/* ============================================================================
 * CONTROLLERS
 * ========================================================================== */

// 📋 Liste toutes les sessions de replay
export async function listReplaySessions(req: Request, res: Response) {
  try {
    ensureAdmin(req);
    const sessions = await prisma.replaySession.findMany({
      include: {
        project: { select: { id: true, name: true } },
        user: { select: { id: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    res.json({ success: true, total: sessions.length, data: sessions });
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
        steps: true, // suppose table ReplayStep liée
      },
    });
    if (!session) return res.status(404).json({ success: false, message: "Replay introuvable" });

    res.json({ success: true, data: session });
  } catch (err: any) {
    console.error("❌ getReplayById error:", err);
    if (err?.code === "P2025") return res.status(404).json({ success: false, message: "Replay introuvable" });
    res.status(500).json({ success: false, message: "Erreur récupération replay" });
  }
}

// 🗑️ Suppression d’une session replay
export async function deleteReplay(req: Request, res: Response) {
  try {
    ensureAdmin(req);
    const { id } = IdSchema.parse(req.params.id);

    // Supprimer d'abord les steps liés si ReplayStep existe
    await prisma.replayStep?.deleteMany({ where: { sessionId: id } }).catch(() => null);

    await prisma.replaySession.delete({ where: { id } });

    await auditLog((req as any).user?.id, "ADMIN_REPLAY_DELETE", { replayId: id });

    res.json({ success: true, message: `Replay ${id} supprimé` });
  } catch (err: any) {
    console.error("❌ deleteReplay error:", err);
    if (err?.code === "P2025") return res.status(404).json({ success: false, message: "Replay introuvable" });
    res.status(500).json({ success: false, message: "Erreur suppression replay" });
  }
}

// 📊 Stats des replays
export async function replayStats(req: Request, res: Response) {
  try {
    ensureAdmin(req);

    const [totalSessions, totalSteps, last24h] = await Promise.all([
      prisma.replaySession.count(),
      prisma.replayStep?.count() ?? 0,
      prisma.replaySession.count({
        where: { createdAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) } },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalSessions,
        totalSteps,
        sessionsLast24h: last24h,
      },
    });
  } catch (err) {
    console.error("❌ replayStats error:", err);
    res.status(500).json({ success: false, message: "Erreur récupération stats replays" });
  }
}
