import express from "express";
import { prisma } from "../utils/prisma.js";
import { nanoid } from "nanoid";

const router = express.Router();

// ✅ Créer un lien de partage
router.post("/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;
    const { isPublic } = req.body;

    const token = nanoid(12);

    const link = await prisma.shareLink.create({
      data: { projectId, token, isPublic }
    });

    res.json({
      url: `${process.env.FRONTEND_URL}/preview/${projectId}?token=${token}`,
      link
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Accéder à un projet via lien public
router.get("/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;
    const { token } = req.query;

    const link = await prisma.shareLink.findFirst({
      where: { projectId, token }
    });

    if (!link) return res.status(403).json({ error: "Invalid or expired link" });

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { pages: true }
    });

    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
