import { Request, Response } from "express";
import { prisma } from "../../utils/prisma";

/* ============================================================================
 *  REPLAYS ADMIN CONTROLLER
 * ========================================================================== */

// 📋 Liste toutes les sessions de replay
export async function listReplaySessions(_req: Request, res: Response) {
  try {
    const sessions = await prisma.replaySession.findMany({
      include: {
        project: { select: { id: true, name: true } },
        user: { select: { id: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: sessions });
  } catch (err) {
    console.error("❌ listReplaySessions error:", err);
    res.status(500).json({ success: false, message: "Erreur récupération sessions replay" });
  }
}

// 🔎 Détail d’une session de replay
export async function getReplayById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const session = await prisma.replaySession.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        user: { select: { id: true, email: true } },
        steps: true, // suppose que ReplaySession a un lien avec ReplayStep/History
      },
    });
    if (!session) return res.status(404).json({ success: false, message: "Replay introuvable" });
    res.json({ success: true, data: session });
  } catch (err) {
    console.error("❌ getReplayById error:", err);
    res.status(500).json({ success: false, message: "Erreur récupération replay" });
  }
}

// 🗑️ Suppression d’une session replay
export async function deleteReplay(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Supprimer d'abord les steps liés si ton schéma Prisma a une table ReplayStep
    await prisma.replayStep?.deleteMany({ where: { sessionId: id } }).catch(() => null);

    await prisma.replaySession.delete({ where: { id } });

    res.json({ success: true, message: `Replay ${id} supprimé` });
  } catch (err) {
    console.error("❌ deleteReplay error:", err);
    res.status(500).json({ success: false, message: "Erreur suppression replay" });
  }
}
