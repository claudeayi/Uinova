import express from "express";
import { prisma } from "../utils/prisma.js";

const router = express.Router();

// ✅ Créer une entrée d’audit
router.post("/", async (req, res) => {
  try {
    const { userId, action, metadata } = req.body;

    const log = await prisma.auditLog.create({
      data: { userId, action, metadata }
    });

    res.json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Lister logs avec filtres (admin)
router.get("/", async (req, res) => {
  try {
    const { userId, action } = req.query;

    const logs = await prisma.auditLog.findMany({
      where: {
        ...(userId && { userId }),
        ...(action && { action })
      },
      orderBy: { createdAt: "desc" }
    });

    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
