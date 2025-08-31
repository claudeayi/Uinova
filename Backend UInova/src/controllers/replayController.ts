import { Request, Response } from "express";
import { prisma } from "../utils/prisma";

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
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "REPLAY_START",
        metadata: { projectId, replayId: replay.id },
      },
    });

    res.status(201).json({ success: true, message: "Replay démarré", data: replay });
  } catch (err) {
    console.error("❌ startReplay error:", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
}

// ✅ POST /replay/:projectId/stop → arrêter l'enregistrement
export async function stopReplay(req: Request, res: Response) {
  try {
    const { projectId } = req.params;
    const { replayId, dataUrl } = req.body;
    const user = (req as any).user;
    if (!user?.id) return res.status(401).json({ success: false, message: "Non autorisé" });

    const replay = await prisma.replaySession.findUnique({ where: { id: replayId } });
    if (!replay) return res.status(404).json({ success: false, message: "Replay introuvable" });

    if (replay.projectId !== projectId) {
      return res.status(400).json({ success: false, message: "Replay invalide pour ce projet" });
    }

    const updated = await prisma.replaySession.update({
      where: { id: replayId },
      data: { dataUrl: dataUrl || `/replays/${projectId}-${Date.now()}.json` },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "REPLAY_STOP",
        metadata: { projectId, replayId },
      },
    });

    res.json({ success: true, message: "Replay enregistré", data: updated });
  } catch (err) {
    console.error("❌ stopReplay error:", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
}

// ✅ GET /replay/:projectId → liste des replays du projet
export async function listReplays(req: Request, res: Response) {
  try {
    const { projectId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const [replays, total] = await Promise.all([
      prisma.replaySession.findMany({
        where: { projectId },
        include: { user: { select: { id: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: Number(limit),
      }),
      prisma.replaySession.count({ where: { projectId } }),
    ]);

    res.json({
      success: true,
      data: replays,
      pagination: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (err) {
    console.error("❌ listReplays error:", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
}

// ✅ GET /replay/:projectId/:replayId → détail d’un replay
export async function getReplay(req: Request, res: Response) {
  try {
    const { replayId } = req.params;
    const replay = await prisma.replaySession.findUnique({
      where: { id: replayId },
      include: { user: { select: { id: true, email: true } } },
    });

    if (!replay) return res.status(404).json({ success: false, message: "Replay introuvable" });

    res.json({ success: true, data: replay });
  } catch (err) {
    console.error("❌ getReplay error:", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
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
        metadata: { projectId, replayId },
      },
    });

    res.json({ success: true, message: "Replay supprimé" });
  } catch (err) {
    console.error("❌ deleteReplay error:", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
}

/* ============================================================================
 *  ADMIN ENDPOINTS – pour ReplaysAdmin.tsx
 * ========================================================================== */

// ✅ GET /admin/replays → liste globale
export async function listAllReplays(req: Request, res: Response) {
  try {
    const role = (req as any).user?.role;
    if (role !== "ADMIN") return res.status(403).json({ success: false, message: "Accès admin requis" });

    const replays = await prisma.replaySession.findMany({
      include: {
        project: { select: { id: true, name: true } },
        user: { select: { id: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    res.json({ success: true, data: replays });
  } catch (err) {
    console.error("❌ listAllReplays error:", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
}
