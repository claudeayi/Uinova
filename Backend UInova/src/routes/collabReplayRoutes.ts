import express from "express";
import { prisma } from "../utils/prisma";

const router = express.Router();

/**
 * GET /api/collab/replay/:projectId
 * Rejoue l’historique collaboratif et renvoie l’état final + steps
 */
router.get("/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!projectId) return res.status(400).json({ error: "Missing projectId" });

    // Récupère l’historique
    const history = await prisma.collabHistory.findMany({
      where: { projectId: String(projectId) },
      orderBy: { createdAt: "asc" },
    });

    // Rejoue les changements (JSON merge simple)
    let finalState: any = {};
    const steps: any[] = [];

    for (const entry of history) {
      // Ici tu peux adapter : CRDT/JSONPatch ou simple merge
      finalState = {
        ...finalState,
        ...entry.changes,
      };

      steps.push({
        userId: entry.userId,
        at: entry.createdAt,
        changes: entry.changes,
        snapshot: finalState,
      });
    }

    res.json({ projectId, steps, finalState });
  } catch (err: any) {
    console.error("❌ [Collab] Replay error:", err);
    res.status(500).json({ error: "Failed to replay history" });
  }
});

export default router;
