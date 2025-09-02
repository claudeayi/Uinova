import { Router } from "express";
import { authenticate } from "../middlewares/security";
import { registerWebhook } from "../services/eventBus";

const router = Router();

/**
 * POST /api/webhooks/register
 * Enregistrer un webhook externe
 */
router.post("/register", authenticate, (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "url manquante" });

  registerWebhook(url);
  res.json({ success: true, url });
});

export default router;
