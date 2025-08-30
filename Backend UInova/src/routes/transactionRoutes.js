import express from "express";
import { prisma } from "../utils/prisma.js";

const router = express.Router();

// ✅ Créer une transaction après un paiement réussi
router.post("/", async (req, res) => {
  try {
    const { userId, provider, amount, currency, status, reference } = req.body;

    const tx = await prisma.transaction.create({
      data: { userId, provider, amount, currency, status, reference }
    });

    res.json(tx);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Lister transactions d’un utilisateur
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const txs = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });
    res.json(txs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
