// src/routes/billing.ts
import { Router } from "express";
import { authenticate } from "../middlewares/security";
import { BillingService } from "../services/billingService";
import {
  SubscriptionCreateSchema,
  SubscriptionUpdateSchema,
  BillingUsageQuerySchema,
} from "../validators/billing.schema";
import { handleValidationErrors } from "../middlewares/validate";
import { prisma } from "../utils/prisma";
import { body, param, query } from "express-validator";

const router = Router();
const billing = new BillingService();

router.use(authenticate);

/* ============================================================================
 * USAGE & RAPPORTS
 * ========================================================================== */

// ✅ Rapport d’usage actuel
router.get("/me", async (req, res) => {
  try {
    const usage = await billing.getUsageReport(req.user!.id);
    res.json({ success: true, data: usage });
  } catch (err) {
    console.error("❌ Billing /me error:", err);
    res.status(500).json({ error: "Erreur récupération usage" });
  }
});

// ✅ Historique agrégé
router.get("/history", async (req, res) => {
  try {
    const history = await billing.getUsageHistory(req.user!.id);
    res.json({ success: true, data: history });
  } catch (err) {
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
    try {
      const parsed = BillingUsageQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({
          error: "INVALID_QUERY",
          details: parsed.error.flatten(),
        });
      }
      const records = await billing.getUsageRecords(req.user!.id, parsed.data);
      res.json({ success: true, data: records });
    } catch (err) {
      console.error("❌ Billing /records error:", err);
      res.status(500).json({ error: "Erreur récupération enregistrements usage" });
    }
  }
);

/* ============================================================================
 * SUBSCRIPTIONS
 * ========================================================================== */
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

      await prisma.auditLog.create({
        data: {
          userId: req.user!.id,
          action: "SUBSCRIPTION_CREATED",
          metadata: { plan: parsed.data.plan },
        },
      });

      res.status(201).json({ success: true, data: sub });
    } catch (err) {
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

      await prisma.auditLog.create({
        data: {
          userId: req.user!.id,
          action: "SUBSCRIPTION_UPDATED",
          metadata: { id: req.params.id, changes: parsed.data },
        },
      });

      res.json({ success: true });
    } catch (err) {
      console.error("❌ Billing PATCH /subscriptions/:id error:", err);
      res.status(500).json({ error: "Erreur mise à jour abonnement" });
    }
  }
);

/* ============================================================================
 * PAYMENTS
 * ========================================================================== */
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

      res.json({
        success: true,
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        data: items,
      });
    } catch (err) {
      console.error("❌ Billing /payments error:", err);
      res.status(500).json({ error: "Erreur récupération paiements" });
    }
  }
);

/* ============================================================================
 * ADMIN ENDPOINTS – stats globales
 * ========================================================================== */
router.get("/admin/overview", async (req, res) => {
  try {
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

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
  } catch (err) {
    console.error("❌ Billing /admin/overview error:", err);
    res.status(500).json({ error: "Erreur récupération statistiques globales" });
  }
});

router.get("/admin/subscriptions", async (req, res) => {
  try {
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({ error: "FORBIDDEN" });
    }
    const subs = await prisma.subscription.findMany({
      include: { user: { select: { id: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({ success: true, data: subs });
  } catch (err) {
    console.error("❌ Billing /admin/subscriptions error:", err);
    res.status(500).json({ error: "Erreur récupération abonnements (admin)" });
  }
});

router.get("/admin/payments", async (req, res) => {
  try {
    if (req.user?.role !== "ADMIN") {
      return res.status(403).json({ error: "FORBIDDEN" });
    }
    const pays = await prisma.payment.findMany({
      include: { user: { select: { id: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({ success: true, data: pays });
  } catch (err) {
    console.error("❌ Billing /admin/payments error:", err);
    res.status(500).json({ error: "Erreur récupération paiements (admin)" });
  }
});

/* ============================================================================
 * HEALTH CHECK
 * ========================================================================== */
router.get("/health", (_req, res) =>
  res.json({
    ok: true,
    service: "billing",
    version: process.env.BILLING_VERSION || "1.0.0",
    ts: Date.now(),
  })
);

export default router;
