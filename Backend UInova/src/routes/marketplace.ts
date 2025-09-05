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
  adminListItems,
  adminDeleteItem,
} from "../controllers/marketplaceController";
import { authenticate, authorize } from "../middlewares/security";
import { validateBody, validateQuery } from "../middlewares/validator";
import {
  publishItemSchema,
  purchaseSchema,
  listItemsQuerySchema,
} from "../validators/marketplace.schema";

const router = Router();

/* ============================================================================
 *  ROUTES PUBLIQUES – accessibles sans authentification
 * ========================================================================== */

// ✅ Liste paginée des items (query: page, pageSize, search?, category?)
router.get("/items", validateQuery(listItemsQuerySchema), listItems);

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

// ✅ Liste complète des items (filtrage + modération)
router.get("/admin/items", authorize(["ADMIN"]), adminListItems);

// ✅ Valider / rejeter un item soumis
router.post("/admin/items/:id/validate", authorize(["ADMIN"]), adminValidateItem);

// ✅ Supprimer un item (modération)
router.delete("/admin/items/:id", authorize(["ADMIN"]), adminDeleteItem);

export default router;
