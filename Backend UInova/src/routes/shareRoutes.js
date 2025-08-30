import express from "express";
import { prisma } from "../utils/prisma.js";
import { nanoid } from "nanoid";

const router = express.Router();

router.post("/share/:projectId", async (req,res) => {
  const { projectId } = req.params;
  const { isPublic } = req.body;

  const token = nanoid(12);
  const link = await prisma.shareLink.create({
    data: { projectId, token, isPublic }
  });
  res.json({ url: `${process.env.FRONTEND_URL}/preview/${projectId}?token=${token}` });
});

router.get("/share/:projectId", async (req,res) => {
  const { projectId } = req.params;
  const { token } = req.query;

  const link = await prisma.shareLink.findFirst({ where: { projectId, token }});
  if (!link) return res.status(403).json({error:"Invalid token"});
  const project = await prisma.project.findUnique({ where: { id: projectId }});
  res.json(project);
});

export default router;
