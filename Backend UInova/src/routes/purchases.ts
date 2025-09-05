import { Router } from "express";
import { body, param } from "express-validator";
import { authenticate, authorize } from "../middlewares/security";
import {
  listPurchases,
  createPurchase,
  getPurchase,
  deletePurchase,
} from "../controllers/purchaseController";
import { handleValidationErrors } from "../middlewares/validate";

const router = Router();

/* ============================================================================
 * PURCHASE ROUTES – nécessite authentification
 * ========================================================================== */
router.use(authenticate);

/**
 * GET /api/purchases
 * ▶️ Liste des achats de l’utilisateur connecté
 * (Admin peut voir tous les achats si nécessaire)
 */
router.get("/", listPurchases);

/**
 * POST /api/purchases
 * ▶️ Créer un nouvel achat (ex: achat d’un template marketplace)
 * body: { itemId: string, paymentProvider?: "STRIPE" | "PAYPAL" | "CINETPAY" }
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
 * ▶️ Annuler un achat (si en attente, pas si déjà payé)
 */
router.delete(
  "/:id",
  param("id").isString().withMessage("id invalide"),
  handleValidationErrors,
  deletePurchase
);

export default router;
