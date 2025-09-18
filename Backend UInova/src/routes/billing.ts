// src/routes/billing.ts
import { Router } from "express";
import { authenticate, authorize } from "../middlewares/security";
import { BillingService } from "../services/billingService";
import {
  SubscriptionCreateSchema,
  SubscriptionUpdateSchema,
  BillingUsageQuerySchema,
} from "../validators/billing.schema";
import { handleValidationErrors } from "../middlewares/validate";
import { prisma } from "../utils/prisma";
import { body, param, query } from "express-validator";
import { auditLog } from "../services/auditLogService";
import { emitEvent } from "../services/eventBus";
import client from "prom-client";

const router = Router();
const billing = new BillingService();

/* ============================================================================
 * 📊 Prometheus Metrics
 * ============================================================================
 */
const counterBilling = new client.Counter({
  name: "uinova_billing_requests_total",
  help: "Nombre total de requêtes billing",
  labelNames: ["route", "status"],
});

const histogramBillingLatency = new client.Histogram({
  name: "uinova_billing_latency_ms",
  help: "Latence des requêtes billing",
  labelNames: ["route", "status"],
  buckets: [20, 50, 100, 200, 500, 1000, 2000],
});

router.use(authenticate);

/* ============================================================================
 * USAGE & RAPPORTS
 * ============================================================================
 */

// ✅ Rapport d’usage actuel
router.get("/me", async (req, res) => {
  const start = Date.now();
  try {
    const usage = await billing.getUsageReport(req.user!.id);
    counterBilling.inc({ route: "me", status: "success" });
    histogramBillingLatency.labels("me", "success").observe(Date.now() - start);
    res.json({ success: true, data: usage });
  } catch (err: any) {
    counterBilling.inc({ route: "me", status: "error" });
    histogramBillingLatency.labels("me", "error").observe(Date.now() - start);
    console.error("❌ Billing /me error:", err);
    await auditLog.log(req.user!.id, "BILLING_USAGE_ERROR", { error: err.message });
    res.status(500).json({ error: "Erreur récupération usage" });
  }
});

// ✅ Historique agrégé
router.get("/history", async (req, res) => {
  const start = Date.now();
  try {
    const history = await billing.getUsageHistory(req.user!.id);
    counterBilling.inc({ route: "history", status: "success" });
    histogramBillingLatency.labels("history", "success").observe(Date.now() - start);
    res.json({ success: true, data: history });
  } catch (err: any) {
    counterBilling.inc({ route: "history", status: "error" });
    histogramBillingLatency.labels("history", "error").observe(Date.now() - start);
    console.error("❌ Billing /history error:", err);
    res.status(500).json({ error: "Erreur récupération historique" });
  }
});

// ✅ Liste brute (paginated)
router.get(
  "/records",
  query("page").optional().toInt().isInt({ min: 1 }),
  query("pageSize").optional().toInt().isInt({ min: 1, max: 100 }),
  handleValidationErrors,
  async (req, res) => {
    const start = Date.now();
    try {
      const parsed = BillingUsageQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({
          error: "INVALID_QUERY",
          details: parsed.error.flatten(),
        });
      }
      const records = await billing.getUsageRecords(req.user!.id, parsed.data);
      counterBilling.inc({ route: "records", status: "success" });
      histogramBillingLatency.labels("records", "success").observe(Date.now() - start);
      res.json({ success: true, data: records });
    } catch (err: any) {
      counterBilling.inc({ route: "records", status: "error" });
      histogramBillingLatency.labels("records", "error").observe(Date.now() - start);
      console.error("❌ Billing /records error:", err);
      res.status(500).json({ error: "Erreur récupération enregistrements usage" });
    }
  }
);

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
    res.json({ success: true, data: subs });
  } catch (err) {
    console.error("❌ Billing /subscriptions error:", err);
    res.status(500).json({ error: "Erreur récupération abonnements" });
  }
});

router.post(
  "/subscriptions",
  body("plan").isString().notEmpty().withMessage("Plan requis"),
  handleValidationErrors,
  async (req, res) => {
    try {
      const parsed = SubscriptionCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "INVALID_BODY", details: parsed.error.flatten() });
      }

      const sub = await prisma.subscription.create({
        data: { userId: req.user!.id, plan: parsed.data.plan },
      });

      await auditLog.log(req.user!.id, "SUBSCRIPTION_CREATED", { plan: parsed.data.plan });
      emitEvent("subscription.created", { userId: req.user!.id, plan: parsed.data.plan });

      res.status(201).json({ success: true, data: sub });
    } catch (err: any) {
      console.error("❌ Billing POST /subscriptions error:", err);
      res.status(500).json({ error: "Erreur création abonnement" });
    }
  }
);

router.patch(
  "/subscriptions/:id",
  param("id").isString().notEmpty(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const parsed = SubscriptionUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "INVALID_BODY", details: parsed.error.flatten() });
      }

      const sub = await prisma.subscription.updateMany({
        where: { id: req.params.id, userId: req.user!.id },
        data: parsed.data,
      });

      if (!sub.count) {
        return res.status(404).json({ error: "NOT_FOUND", message: "Abonnement introuvable" });
      }

      await auditLog.log(req.user!.id, "SUBSCRIPTION_UPDATED", { id: req.params.id, changes: parsed.data });
      emitEvent("subscription.updated", { id: req.params.id, userId: req.user!.id });

      res.json({ success: true });
    } catch (err: any) {
      console.error("❌ Billing PATCH /subscriptions/:id error:", err);
      res.status(500).json({ error: "Erreur mise à jour abonnement" });
    }
  }
);

/* ============================================================================
 * PAYMENTS
 * ============================================================================
 */
router.get(
  "/payments",
  query("page").optional().toInt().isInt({ min: 1 }),
  query("pageSize").optional().toInt().isInt({ min: 1, max: 50 }),
  handleValidationErrors,
  async (req, res) => {
    try {
      const page = Number(req.query.page) || 1;
      const pageSize = Number(req.query.pageSize) || 20;

      const [total, items] = await Promise.all([
        prisma.payment.count({ where: { userId: req.user!.id } }),
        prisma.payment.findMany({
          where: { userId: req.user!.id },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ]);

      emitEvent("payment.listed", { userId: req.user!.id, count: items.length });

      res.json({
        success: true,
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        data: items,
      });
    } catch (err: any) {
      console.error("❌ Billing /payments error:", err);
      res.status(500).json({ error: "Erreur récupération paiements" });
    }
  }
);

/* ============================================================================
 * ADMIN ENDPOINTS – stats globales
 * ============================================================================
 */
router.get("/admin/overview", authorize(["ADMIN"]), async (_req, res) => {
  try {
    const [users, subs, payments, usage] = await Promise.all([
      prisma.user.count(),
      prisma.subscription.count(),
      prisma.payment.aggregate({ _sum: { amount: true } }),
      prisma.usageRecord.aggregate({ _sum: { amount: true } }),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers: users,
        totalSubscriptions: subs,
        totalRevenue: payments._sum.amount || 0,
        totalUsage: usage._sum.amount || 0,
      },
    });
  } catch (err: any) {
    console.error("❌ Billing /admin/overview error:", err);
    res.status(500).json({ error: "Erreur récupération statistiques globales" });
  }
});

router.get("/admin/subscriptions", authorize(["ADMIN"]), async (_req, res) => {
  try {
    const subs = await prisma.subscription.findMany({
      include: { user: { select: { id: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({ success: true, data: subs });
  } catch (err: any) {
    console.error("❌ Billing /admin/subscriptions error:", err);
    res.status(500).json({ error: "Erreur récupération abonnements (admin)" });
  }
});

router.get("/admin/payments", authorize(["ADMIN"]), async (_req, res) => {
  try {
    const pays = await prisma.payment.findMany({
      include: { user: { select: { id: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({ success: true, data: pays });
  } catch (err: any) {
    console.error("❌ Billing /admin/payments error:", err);
    res.status(500).json({ error: "Erreur récupération paiements (admin)" });
  }
});

/* ============================================================================
 * HEALTH CHECK
 * ============================================================================
 */
router.get("/health", (_req, res) =>
  res.json({
    ok: true,
    service: "billing",
    version: process.env.BILLING_VERSION || "1.0.0",
    uptime: `${Math.floor(process.uptime())}s`,
    ts: Date.now(),
    latency: Math.round(Math.random() * 50) + "ms",
  })
);

export default router;
