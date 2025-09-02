import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { getReplaySession, saveReplaySession } from "../services/replayService";

/* ============================================================================
 *  REPLAY CONTROLLER – gestion des replays collaboratifs
 * ========================================================================== */

// ✅ POST /replay/:projectId/start → commencer un enregistrement
export async function startReplay(req: Request, res: Response) {
  try {
    const { projectId } = req.params;
    const user = (req as any).user;
    if (!user?.id) return res.status(401).json({ success: false, message: "Non autorisé" });

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ success: false, message: "Projet introuvable" });

    if (project.ownerId !== user.id && user.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Accès interdit à ce projet" });
    }

    const replay = await prisma.replaySession.create({
      data: {
        projectId,
        userId: user.id,
        dataUrl: "", // sera rempli lors du stop
        startedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "REPLAY_START",
        metadata: { projectId, replayId: replay.id, ip: req.ip, ua: req.headers["user-agent"] },
      },
    });

    res.status(201).json({ success: true, message: "Replay démarré", data: replay });
  } catch (err: any) {
    console.error("❌ startReplay error:", err);
    res.status(500).json({ success: false, message: err.message || "Erreur serveur" });
  }
}

// ✅ POST /replay/:projectId/stop → arrêter l'enregistrement
export async function stopReplay(req: Request, res: Response) {
  try {
    const { projectId } = req.params;
    const { replayId, dataUrl } = req.body;
    const user = (req as any).user;
    if (!user?.id) return res.status(401).json({ success: false, message: "Non autorisé" });
    if (!replayId) return res.status(400).json({ success: false, message: "replayId requis" });

    const replay = await prisma.replaySession.findUnique({ where: { id: replayId } });
    if (!replay) return res.status(404).json({ success: false, message: "Replay introuvable" });

    if (replay.projectId !== projectId) {
      return res.status(400).json({ success: false, message: "Replay invalide pour ce projet" });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ success: false, message: "Projet introuvable" });
    if (project.ownerId !== user.id && user.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Accès interdit" });
    }

    // ⚡ Sauvegarde snapshot + steps compressés
    const savedSession = await saveReplaySession(projectId, user.id);

    const updated = await prisma.replaySession.update({
      where: { id: replayId },
      data: {
        dataUrl: dataUrl || `/replays/${projectId}-${Date.now()}.json`,
        endedAt: new Date(),
        stepsCompressed: savedSession.stepsCompressed,
        snapshot: savedSession.snapshot,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "REPLAY_STOP",
        metadata: { projectId, replayId, dataUrl: updated.dataUrl, ip: req.ip, ua: req.headers["user-agent"] },
      },
    });

    res.json({ success: true, message: "Replay enregistré", data: updated });
  } catch (err: any) {
    console.error("❌ stopReplay error:", err);
    res.status(500).json({ success: false, message: err.message || "Erreur serveur" });
  }
}

// ✅ GET /replay/:projectId → liste des replays du projet
export async function listReplays(req: Request, res: Response) {
  try {
    const { projectId } = req.params;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [replays, total] = await Promise.all([
      prisma.replaySession.findMany({
        where: { projectId },
        include: { user: { select: { id: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.replaySession.count({ where: { projectId } }),
    ]);

    res.json({
      success: true,
      data: replays,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err: any) {
    console.error("❌ listReplays error:", err);
    res.status(500).json({ success: false, message: err.message || "Erreur serveur" });
  }
}

// ✅ GET /replay/:projectId/:replayId → détail d’un replay (avec steps)
export async function getReplay(req: Request, res: Response) {
  try {
    const { replayId } = req.params;
    if (!replayId) return res.status(400).json({ success: false, message: "replayId requis" });

    const replay = await getReplaySession(replayId);
    if (!replay) return res.status(404).json({ success: false, message: "Replay introuvable" });

    res.json({ success: true, data: replay });
  } catch (err: any) {
    console.error("❌ getReplay error:", err);
    res.status(500).json({ success: false, message: err.message || "Erreur serveur" });
  }
}

// ✅ DELETE /replay/:projectId/:replayId → suppression (owner/admin)
export async function deleteReplay(req: Request, res: Response) {
  try {
    const { projectId, replayId } = req.params;
    const user = (req as any).user;
    if (!user?.id) return res.status(401).json({ success: false, message: "Non autorisé" });

    const replay = await prisma.replaySession.findUnique({ where: { id: replayId } });
    if (!replay || replay.projectId !== projectId) {
      return res.status(404).json({ success: false, message: "Replay introuvable" });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ success: false, message: "Projet introuvable" });
    if (project.ownerId !== user.id && user.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Accès interdit" });
    }

    await prisma.replaySession.delete({ where: { id: replayId } });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "REPLAY_DELETE",
        metadata: { projectId, replayId, ip: req.ip, ua: req.headers["user-agent"] },
      },
    });

    res.json({ success: true, message: "Replay supprimé" });
  } catch (err: any) {
    console.error("❌ deleteReplay error:", err);
    res.status(500).json({ success: false, message: err.message || "Erreur serveur" });
  }
}

/* ============================================================================
 *  ADMIN ENDPOINTS – pour ReplaysAdmin.tsx
 * ========================================================================== */

// ✅ GET /admin/replays → liste globale
export async function listAllReplays(req: Request, res: Response) {
  try {
    const role = (req as any).user?.role;
    if (role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Accès admin requis" });
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.pageSize) || 50));
    const skip = (page - 1) * limit;

    const [replays, total] = await Promise.all([
      prisma.replaySession.findMany({
        include: {
          project: { select: { id: true, name: true } },
          user: { select: { id: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.replaySession.count(),
    ]);

    res.json({
      success: true,
      data: replays,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err: any) {
    console.error("❌ listAllReplays error:", err);
    res.status(500).json({ success: false, message: err.message || "Erreur serveur" });
  }
}
