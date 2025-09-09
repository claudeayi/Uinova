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

const router = Router();

/* ============================================================================
 * PURCHASE ROUTES – Auth Required
 * ============================================================================
 */
router.use(authenticate);

/**
 * GET /api/purchases
 * ▶️ Liste des achats de l’utilisateur connecté
 * Query params : ?status=&provider=&page=&pageSize=&from=&to=
 * - status: "PENDING" | "PAID" | "CANCELLED" | "REFUNDED"
 * - provider: "STRIPE" | "PAYPAL" | "CINETPAY" | "MOCK"
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
 * ▶️ Créer un nouvel achat (ex: achat d’un template marketplace)
 * body: { itemId: string, paymentProvider?: "STRIPE" | "PAYPAL" | "CINETPAY" | "MOCK" }
 */
router.post(
  "/",
  body("itemId").isString().withMessage("itemId requis"),
  body("paymentProvider")
    .optional()
    .isIn(["STRIPE", "PAYPAL", "CINETPAY", "MOCK"])
    .withMessage("Fournisseur de paiement invalide"),
  handleValidationErrors,
  createPurchase
);

/**
 * GET /api/purchases/:id
 * ▶️ Récupérer le détail d’un achat
 */
router.get(
  "/:id",
  param("id").isString().withMessage("id invalide"),
  handleValidationErrors,
  getPurchase
);

/**
 * DELETE /api/purchases/:id
 * ▶️ Annuler un achat (seulement si en attente)
 */
router.delete(
  "/:id",
  param("id").isString().withMessage("id invalide"),
  handleValidationErrors,
  deletePurchase
);

/* ============================================================================
 * ADMIN ROUTES – Rôle ADMIN uniquement
 * ============================================================================
 */

/**
 * GET /api/purchases/admin
 * ▶️ Lister tous les achats (avec filtres avancés)
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
 * ▶️ Rembourser un achat (si payé, via provider)
 */
router.post(
  "/:id/refund",
  authorize(["ADMIN"]),
  param("id").isString().withMessage("id invalide"),
  handleValidationErrors,
  refundPurchase
);

export default router;
