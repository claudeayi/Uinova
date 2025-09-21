// src/routes/transactions.ts
import { Router } from "express";
import { body, param, query } from "express-validator";
import { prisma } from "../utils/prisma";
import { authenticate, authorize } from "../middlewares/security";
import { handleValidationErrors } from "../middlewares/validate";
import { auditLog } from "../services/auditLogService";
import { emitEvent } from "../services/eventBus";
import client from "prom-client";

const router = Router();

/* ============================================================================
 * 📊 Prometheus Metrics
 * ========================================================================== */
const counterTx = new client.Counter({
  name: "uinova_transactions_total",
  help: "Nombre total de transactions créées",
  labelNames: ["provider", "status"],
});

const histogramTxLatency = new client.Histogram({
  name: "uinova_transactions_latency_ms",
  help: "Latence de création des transactions",
  buckets: [50, 100, 200, 500, 1000, 5000],
});

/* ============================================================================
 *  TRANSACTIONS ROUTES
 * ========================================================================== */
router.use(authenticate);

/**
 * POST /api/transactions
 * ✅ Créer une transaction après un paiement réussi
 */
router.post(
  "/",
  body("provider").isIn(["STRIPE", "PAYPAL", "CINETPAY", "MOCK"]),
  body("amount").isInt({ min: 1, max: 1_000_000 }).withMessage("Montant invalide"),
  body("currency").isString().isLength({ min: 3, max: 3 }),
  body("status").isIn(["PENDING", "SUCCESS", "FAILED", "REFUNDED"]),
  body("reference").isString().isLength({ min: 5 }),
  handleValidationErrors,
  async (req, res) => {
    const start = Date.now();
    try {
      const { provider, amount, currency, status, reference } = req.body;

      const tx = await prisma.transaction.create({
        data: { userId: req.user!.id, provider, amount, currency, status, reference },
      });

      // Metrics
      counterTx.inc({ provider, status });
      histogramTxLatency.observe(Date.now() - start);

      // Audit + Event
      await auditLog.log(req.user!.id, "TRANSACTION_CREATED", { id: tx.id, provider, amount });
      emitEvent("transaction.created", { userId: req.user!.id, id: tx.id });

      res.status(201).json({ success: true, message: "Transaction créée", data: tx });
    } catch (err: any) {
      console.error("❌ Transaction create error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * GET /api/transactions/user/:userId
 * ✅ Lister transactions d’un utilisateur
 */
router.get(
  "/user/:userId",
  param("userId").isString(),
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("pageSize").optional().isInt({ min: 1, max: 100 }).toInt(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const page = Number(req.query.page) || 1;
      const pageSize = Math.min(Number(req.query.pageSize) || 20, 100);

      if (req.user!.role !== "ADMIN" && req.user!.id !== userId) {
        return res.status(403).json({ success: false, error: "Accès interdit" });
      }

      const [total, txs] = await Promise.all([
        prisma.transaction.count({ where: { userId } }),
        prisma.transaction.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ]);

      await auditLog.log(req.user!.id, "TRANSACTION_LIST", { userId, count: txs.length });

      res.json({
        success: true,
        data: txs,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      });
    } catch (err: any) {
      console.error("❌ Transaction list error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * GET /api/transactions/:id
 * ✅ Récupérer le détail d’une transaction
 */
router.get(
  "/:id",
  param("id").isString(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const tx = await prisma.transaction.findUnique({ where: { id } });

      if (!tx) return res.status(404).json({ success: false, error: "Transaction introuvable" });
      if (req.user!.role !== "ADMIN" && tx.userId !== req.user!.id) {
        return res.status(403).json({ success: false, error: "Accès interdit" });
      }

      await auditLog.log(req.user!.id, "TRANSACTION_GET", { id });
      res.json({ success: true, data: tx });
    } catch (err: any) {
      console.error("❌ Transaction get error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * DELETE /api/transactions/:id
 * ✅ Supprimer une transaction (ADMIN only)
 */
router.delete(
  "/:id",
  authorize(["ADMIN"]),
  param("id").isString(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      await prisma.transaction.delete({ where: { id } });

      await auditLog.log(req.user!.id, "TRANSACTION_DELETED", { id });
      emitEvent("transaction.deleted", { adminId: req.user!.id, id });

      res.json({ success: true, message: `Transaction ${id} supprimée` });
    } catch (err: any) {
      console.error("❌ Transaction delete error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * GET /api/transactions/search/ref/:reference
 * ✅ Rechercher une transaction par référence
 */
router.get(
  "/search/ref/:reference",
  param("reference").isString(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { reference } = req.params;
      const tx = await prisma.transaction.findUnique({ where: { reference } });

      if (!tx) return res.status(404).json({ success: false, error: "Transaction introuvable" });
      if (req.user!.role !== "ADMIN" && tx.userId !== req.user!.id) {
        return res.status(403).json({ success: false, error: "Accès interdit" });
      }

      await auditLog.log(req.user!.id, "TRANSACTION_SEARCH", { reference });
      emitEvent("transaction.searched", { userId: req.user!.id, reference });

      res.json({ success: true, data: tx });
    } catch (err: any) {
      console.error("❌ Transaction search error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

export default router;
