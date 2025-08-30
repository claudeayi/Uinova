import { Request, Response } from "express";
import { prisma } from "../utils/prisma";

// ✅ POST /replay/:projectId/start → commencer un enregistrement
export async function startReplay(req: Request, res: Response) {
  try {
    const { projectId } = req.params;
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: "Non autorisé" });

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ message: "Projet introuvable" });

    // ⚡ Création d'une "session replay" (vide au départ)
    const replay = await prisma.replaySession.create({
      data: {
        projectId,
        dataUrl: "", // sera rempli à la fin
      },
    });

    res.status(201).json({
      success: true,
      message: "Replay démarré",
      replay,
    });
  } catch (err) {
    console.error("❌ startReplay error:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
}

// ✅ POST /replay/:projectId/stop → arrêter l'enregistrement
export async function stopReplay(req: Request, res: Response) {
  try {
    const { projectId } = req.params;
    const { replayId, dataUrl } = req.body;

    const replay = await prisma.replaySession.update({
      where: { id: replayId },
      data: {
        dataUrl: dataUrl || `/replays/${projectId}-${Date.now()}.json`, // ⚡ stockage simulé
      },
    });

    res.json({
      success: true,
      message: "Replay enregistré",
      replay,
    });
  } catch (err) {
    console.error("❌ stopReplay error:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
}

// ✅ GET /replay/:projectId → liste des replays du projet
export async function listReplays(req: Request, res: Response) {
  try {
    const { projectId } = req.params;
    const replays = await prisma.replaySession.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });

    res.json(replays);
  } catch (err) {
    console.error("❌ listReplays error:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
}

// ✅ GET /replay/:projectId/:replayId → détail d’un replay
export async function getReplay(req: Request, res: Response) {
  try {
    const { replayId } = req.params;
    const replay = await prisma.replaySession.findUnique({ where: { id: replayId } });

    if (!replay) return res.status(404).json({ message: "Replay introuvable" });
    res.json(replay);
  } catch (err) {
    console.error("❌ getReplay error:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
}
