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
        dataUrl: "", // rempli à la fin
      },
    });

    // Audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "REPLAY_START",
        metadata: { projectId, replayId: replay.id },
      },
    });

    res.status(201).json({
      success: true,
      message: "Replay démarré",
      data: replay,
    });
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

    const replay = await prisma.replaySession.update({
      where: { id: replayId },
      data: {
        dataUrl: dataUrl || `/replays/${projectId}-${Date.now()}.json`,
      },
    });

    // Audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "REPLAY_STOP",
        metadata: { projectId, replayId },
      },
    });

    res.json({
      success: true,
      message: "Replay enregistré",
      data: replay,
    });
  } catch (err) {
    console.error("❌ stopReplay error:", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
}

// ✅ GET /replay/:projectId → liste des replays du projet
export async function listReplays(req: Request, res: Response) {
  try {
    const { projectId } = req.params;
    const replays = await prisma.replaySession.findMany({
      where: { projectId },
      include: { user: { select: { id: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: replays,
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

    res.json({
      success: true,
      data: replay,
    });
  } catch (err) {
    console.error("❌ getReplay error:", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
}

// ✅ DELETE /replay/:projectId/:replayId → suppression (admin ou owner)
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
