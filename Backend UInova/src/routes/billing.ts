import { Router } from "express";
import { authenticate } from "../middlewares/security";
import { BillingService } from "../services/billingService";
import { SubscriptionCreateSchema, SubscriptionUpdateSchema, BillingUsageQuerySchema } from "../validators/billing.schema";
import { handleValidationErrors } from "../middlewares/validate";
import { prisma } from "../utils/prisma";

const router = Router();
const billing = new BillingService();

router.use(authenticate);

/* ============================================================================
 * GET /api/billing/me
 * Rapport d’usage actuel de l’utilisateur connecté
 * ============================================================================
 */
router.get("/me", async (req, res) => {
  try {
    const usage = await billing.getUsageReport(req.user!.id);
    res.json(usage);
  } catch (err) {
    console.error("❌ Billing /me error:", err);
    res.status(500).json({ error: "Erreur récupération usage" });
  }
});

/* ============================================================================
 * GET /api/billing/history
 * Historique agrégé (UsageHistory)
 * ============================================================================
 */
router.get("/history", async (req, res) => {
  try {
    const history = await billing.getUsageHistory(req.user!.id);
    res.json(history);
  } catch (err) {
    console.error("❌ Billing /history error:", err);
    res.status(500).json({ error: "Erreur récupération historique" });
  }
});

/* ============================================================================
 * GET /api/billing/records
 * Liste brute des enregistrements d’usage (UsageRecord)
 * ============================================================================
 */
router.get("/records", async (req, res) => {
  try {
    const parsed = BillingUsageQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: "INVALID_QUERY", details: parsed.error.flatten() });
    }
    const records = await billing.getUsageRecords(req.user!.id, parsed.data);
    res.json(records);
  } catch (err) {
    console.error("❌ Billing /records error:", err);
    res.status(500).json({ error: "Erreur récupération enregistrements usage" });
  }
});

/* ============================================================================
 * SUBSCRIPTIONS
 * ============================================================================
 */
router.get("/subscriptions", async (req, res) => {
  try {
    const subs = await prisma.subscription.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
    });
    res.json(subs);
  } catch (err) {
    console.error("❌ Billing /subscriptions error:", err);
    res.status(500).json({ error: "Erreur récupération abonnements" });
  }
});

router.post("/subscriptions", async (req, res) => {
  try {
    const parsed = SubscriptionCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "INVALID_BODY", details: parsed.error.flatten() });
    }

    const sub = await prisma.subscription.create({
      data: { userId: req.user!.id, plan: parsed.data.plan },
    });
    res.status(201).json(sub);
  } catch (err) {
    console.error("❌ Billing POST /subscriptions error:", err);
    res.status(500).json({ error: "Erreur création abonnement" });
  }
});

router.patch("/subscriptions/:id", async (req, res) => {
  try {
    const parsed = SubscriptionUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "INVALID_BODY", details: parsed.error.flatten() });
    }

    const sub = await prisma.subscription.update({
      where: { id: req.params.id, userId: req.user!.id },
      data: parsed.data,
    });
    res.json(sub);
  } catch (err) {
    console.error("❌ Billing PATCH /subscriptions/:id error:", err);
    res.status(500).json({ error: "Erreur mise à jour abonnement" });
  }
});

/* ============================================================================
 * PAYMENTS (liés facturation)
 * ============================================================================
 */
router.get("/payments", async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    res.json(payments);
  } catch (err) {
    console.error("❌ Billing /payments error:", err);
    res.status(500).json({ error: "Erreur récupération paiements" });
  }
});

export default router;
