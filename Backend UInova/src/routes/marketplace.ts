// src/routes/marketplace.ts
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
import {
  publishItemSchema,
  purchaseSchema,
} from "../validators/marketplace.schema";

const router = Router();

/* ============================================================================
 *  ROUTES PUBLIQUES – accessibles sans authentification
 * ========================================================================== */

// ✅ Liste paginée des items (query: page, pageSize, search?, category?)
router.get("/items", listItems);

// ✅ Détail d’un item par ID
router.get("/items/:id", getItem);

/* ============================================================================
 *  ROUTES UTILISATEUR – nécessite authentification
 * ========================================================================== */
router.use(authenticate);

// ✅ Publier un nouvel item marketplace
router.post("/items", validateBody(publishItemSchema), publishItem);

// ✅ Mettre à jour son propre item
router.patch("/items/:id", validateBody(publishItemSchema.partial()), updateItem);

// ✅ Supprimer son propre item
router.delete("/items/:id", deleteItem);

// ✅ Liste des items de l’utilisateur connecté
router.get("/my/items", listUserItems);

// ✅ Acheter un item
router.post("/purchase", validateBody(purchaseSchema), purchaseItem);

/* ============================================================================
 *  ROUTES ADMIN – nécessite rôle administrateur
 * ========================================================================== */

// ✅ Valider / rejeter un item soumis
router.post("/admin/items/:id/validate", authorize(["admin"]), adminValidateItem);

export default router;
