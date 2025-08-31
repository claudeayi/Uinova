import { Router } from "express";
import {
  listItems,
  getItem,
  publishItem,
  purchaseItem,
  updateItem,
  deleteItem,
  listUserItems,
  adminValidateItem,
} from "../controllers/marketplaceController";
import { authenticate, authorize } from "../middlewares/security";
import { validateBody } from "../middlewares/validator";
import { publishItemSchema, purchaseSchema } from "../validators/marketplace.schema";

const router = Router();

/* ============================================================================
 *  ROUTES PUBLIC – accessibles sans authentification
 * ========================================================================== */

// ✅ Liste paginée des items
router.get("/items", listItems);

// ✅ Détail d’un item par ID
router.get("/items/:id", getItem);

/* ============================================================================
 *  ROUTES PROTÉGÉES – utilisateur authentifié
 * ========================================================================== */

// ✅ Publier un nouvel item marketplace
router.post(
  "/items",
  authenticate,
  validateBody(publishItemSchema), // validation Zod/Yup
  publishItem
);

// ✅ Mettre à jour son propre item
router.patch(
  "/items/:id",
  authenticate,
  validateBody(publishItemSchema.partial()),
  updateItem
);

// ✅ Supprimer son propre item
router.delete("/items/:id", authenticate, deleteItem);

// ✅ Liste des items de l’utilisateur connecté
router.get("/my/items", authenticate, listUserItems);

// ✅ Acheter un item
router.post(
  "/purchase",
  authenticate,
  validateBody(purchaseSchema),
  purchaseItem
);

/* ============================================================================
 *  ROUTES ADMIN – nécessite rôle administrateur
 * ========================================================================== */

// ✅ Valider / rejeter un item soumis
router.post(
  "/admin/items/:id/validate",
  authenticate,
  authorize(["admin"]),
  adminValidateItem
);

export default router;
