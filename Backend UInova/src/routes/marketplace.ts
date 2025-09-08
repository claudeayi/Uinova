// src/routes/marketplace.ts
import { Router } from "express";
import { param } from "express-validator";
import {
  listItems,
  getItem,
  publishItem,
  purchaseItem,
  updateItem,
  deleteItem,
  listUserItems,
  adminValidateItem,
  adminListItems,
  adminDeleteItem,
} from "../controllers/marketplaceController";
import { authenticate, authorize } from "../middlewares/security";
import { validateBody, validateQuery } from "../middlewares/validator";
import { handleValidationErrors } from "../middlewares/validate";
import {
  publishItemSchema,
  purchaseSchema,
  listItemsQuerySchema,
} from "../validators/marketplace.schema";

const router = Router();

/* ============================================================================
 *  ROUTES PUBLIQUES – accessibles sans authentification
 * ========================================================================== */

/**
 * GET /api/marketplace/items
 * ▶️ Liste paginée des items
 * Query: { page, pageSize, search?, category?, sort? }
 */
router.get("/items", validateQuery(listItemsQuerySchema), listItems);

/**
 * GET /api/marketplace/items/:id
 * ▶️ Détail d’un item par ID
 */
router.get(
  "/items/:id",
  param("id").isString().isLength({ min: 5 }).withMessage("ID invalide"),
  handleValidationErrors,
  getItem
);

/* ============================================================================
 *  ROUTES UTILISATEUR – nécessite authentification
 * ========================================================================== */
router.use(authenticate);

/**
 * POST /api/marketplace/items
 * ▶️ Publier un nouvel item marketplace
 */
router.post("/items", validateBody(publishItemSchema), publishItem);

/**
 * PATCH /api/marketplace/items/:id
 * ▶️ Mettre à jour son propre item
 */
router.patch(
  "/items/:id",
  param("id").isString().isLength({ min: 5 }),
  handleValidationErrors,
  validateBody(publishItemSchema.partial()),
  updateItem
);

/**
 * DELETE /api/marketplace/items/:id
 * ▶️ Supprimer son propre item
 */
router.delete(
  "/items/:id",
  param("id").isString().isLength({ min: 5 }),
  handleValidationErrors,
  deleteItem
);

/**
 * GET /api/marketplace/my/items
 * ▶️ Liste des items de l’utilisateur connecté
 */
router.get("/my/items", listUserItems);

/**
 * POST /api/marketplace/purchase
 * ▶️ Acheter un item
 */
router.post("/purchase", validateBody(purchaseSchema), purchaseItem);

/* ============================================================================
 *  ROUTES ADMIN – nécessite rôle administrateur
 * ========================================================================== */

/**
 * GET /api/marketplace/admin/items
 * ▶️ Liste complète des items (modération)
 */
router.get("/admin/items", authorize(["ADMIN"]), adminListItems);

/**
 * POST /api/marketplace/admin/items/:id/validate
 * ▶️ Valider / rejeter un item
 */
router.post(
  "/admin/items/:id/validate",
  authorize(["ADMIN"]),
  param("id").isString().isLength({ min: 5 }),
  handleValidationErrors,
  adminValidateItem
);

/**
 * DELETE /api/marketplace/admin/items/:id
 * ▶️ Supprimer un item (modération)
 */
router.delete(
  "/admin/items/:id",
  authorize(["ADMIN"]),
  param("id").isString().isLength({ min: 5 }),
  handleValidationErrors,
  adminDeleteItem
);

export default router;
