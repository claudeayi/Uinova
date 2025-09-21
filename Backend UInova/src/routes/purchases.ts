// src/routes/purchases.ts
import { Router } from "express";
import { body, param, query } from "express-validator";
import { authenticate, authorize } from "../middlewares/security";
import {
  listPurchases,
  createPurchase,
  getPurchase,
  deletePurchase,
  adminListPurchases,
  refundPurchase,
} from "../controllers/purchaseController";
import { handleValidationErrors } from "../middlewares/validate";
import client from "prom-client";
import { auditLog } from "../services/auditLogService";
import { emitEvent } from "../services/eventBus";

const router = Router();

/* ============================================================================
 * 📊 Metrics Prometheus
 * ========================================================================== */
const counterPurchases = new client.Counter({
  name: "uinova_purchases_total",
  help: "Nombre total d’achats",
  labelNames: ["action", "provider", "status"],
});

const histogramPurchaseLatency = new client.Histogram({
  name: "uinova_purchases_latency_ms",
  help: "Latence des opérations d’achat en ms",
  labelNames: ["action", "provider", "status"],
  buckets: [50, 100, 200, 500, 1000, 2000, 5000, 10000],
});

/* ============================================================================
 * PURCHASE ROUTES – Auth Required
 * ========================================================================== */
router.use(authenticate);

/**
 * GET /api/purchases
 * ▶️ Liste des achats de l’utilisateur connecté
 */
router.get(
  "/",
  query("status").optional().isIn(["PENDING", "PAID", "CANCELLED", "REFUNDED"]),
  query("provider").optional().isIn(["STRIPE", "PAYPAL", "CINETPAY", "MOCK"]),
  query("page").optional().isInt({ min: 1 }),
  query("pageSize").optional().isInt({ min: 1, max: 100 }),
  query("from").optional().isISO8601().toDate(),
  query("to").optional().isISO8601().toDate(),
  handleValidationErrors,
  listPurchases
);

/**
 * POST /api/purchases
 * ▶️ Créer un nouvel achat
 */
router.post(
  "/",
  body("itemId").isString().withMessage("itemId requis"),
  body("paymentProvider")
    .optional()
    .isIn(["STRIPE", "PAYPAL", "CINETPAY", "MOCK"])
    .withMessage("Fournisseur de paiement invalide"),
  handleValidationErrors,
  async (req, res, next) => {
    const start = Date.now();
    const result = await createPurchase(req, res, next);

    const provider = req.body.paymentProvider || "MOCK";
    counterPurchases.inc({ action: "create", provider, status: "created" });
    histogramPurchaseLatency.labels("create", provider, "created").observe(Date.now() - start);

    await auditLog.log(req.user?.id, "PURCHASE_CREATED", { itemId: req.body.itemId, provider });
    emitEvent("purchase.created", { userId: req.user?.id, itemId: req.body.itemId, provider });

    return result;
  }
);

/**
 * GET /api/purchases/:id
 * ▶️ Récupérer le détail d’un achat
 */
router.get("/:id", param("id").isString().withMessage("id invalide"), handleValidationErrors, getPurchase);

/**
 * DELETE /api/purchases/:id
 * ▶️ Annuler un achat (si en attente)
 */
router.delete(
  "/:id",
  param("id").isString().withMessage("id invalide"),
  handleValidationErrors,
  async (req, res, next) => {
    const start = Date.now();
    const result = await deletePurchase(req, res, next);

    counterPurchases.inc({ action: "cancel", provider: "any", status: "cancelled" });
    histogramPurchaseLatency.labels("cancel", "any", "cancelled").observe(Date.now() - start);

    await auditLog.log(req.user?.id, "PURCHASE_CANCELLED", { purchaseId: req.params.id });
    emitEvent("purchase.cancelled", { purchaseId: req.params.id, userId: req.user?.id });

    return result;
  }
);

/* ============================================================================
 * ADMIN ROUTES
 * ========================================================================== */

/**
 * GET /api/purchases/admin
 * ▶️ Lister tous les achats (admin only)
 */
router.get(
  "/admin",
  authorize(["ADMIN"]),
  query("status").optional().isIn(["PENDING", "PAID", "CANCELLED", "REFUNDED"]),
  query("provider").optional().isIn(["STRIPE", "PAYPAL", "CINETPAY", "MOCK"]),
  query("userId").optional().isString(),
  query("page").optional().isInt({ min: 1 }),
  query("pageSize").optional().isInt({ min: 1, max: 200 }),
  handleValidationErrors,
  adminListPurchases
);

/**
 * POST /api/purchases/:id/refund
 * ▶️ Rembourser un achat (admin only)
 */
router.post(
  "/:id/refund",
  authorize(["ADMIN"]),
  param("id").isString().withMessage("id invalide"),
  handleValidationErrors,
  async (req, res, next) => {
    const start = Date.now();
    const result = await refundPurchase(req, res, next);

    counterPurchases.inc({ action: "refund", provider: "any", status: "refunded" });
    histogramPurchaseLatency.labels("refund", "any", "refunded").observe(Date.now() - start);

    await auditLog.log(req.user?.id, "PURCHASE_REFUNDED", { purchaseId: req.params.id });
    emitEvent("purchase.refunded", { purchaseId: req.params.id, adminId: req.user?.id });

    return result;
  }
);

export default router;
