import { Router } from "express";
import { authenticate } from "../middlewares/security";
import { BillingService } from "../services/billingService";

const router = Router();
const billing = new BillingService();

router.use(authenticate);

/**
 * GET /api/billing/me
 * Récupérer l’usage actuel de l’utilisateur
 */
router.get("/me", async (req, res) => {
  try {
    const usage = await billing.getUsageReport(req.user!.id);
    res.json(usage);
  } catch (err) {
    console.error("❌ Billing error:", err);
    res.status(500).json({ error: "Erreur récupération usage" });
  }
});

export default router;
