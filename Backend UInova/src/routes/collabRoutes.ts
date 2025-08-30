import express from "express";
import { prisma } from "../utils/prisma";

const router = express.Router();

/**
 * GET /api/collab/history/:projectId
 * Récupère l’historique des modifications collaboratives d’un projet
 */
router.get("/history/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!projectId) return res.status(400).json({ error: "Missing projectId" });

    const history = await prisma.collabHistory.findMany({
      where: { projectId: String(projectId) },
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });

    res.json(history);
  } catch (err: any) {
    console.error("❌ [Collab] Error fetching history:", err);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

/**
 * DELETE /api/collab/history/:projectId
 * Vide l’historique d’un projet (admin only)
 */
router.delete("/history/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!projectId) return res.status(400).json({ error: "Missing projectId" });

    await prisma.collabHistory.deleteMany({ where: { projectId: String(projectId) } });

    res.json({ success: true });
  } catch (err: any) {
    console.error("❌ [Collab] Error deleting history:", err);
    res.status(500).json({ error: "Failed to delete history" });
  }
});

export default router;
