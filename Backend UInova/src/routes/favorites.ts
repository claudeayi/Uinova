import { Router } from "express";
import { authenticate } from "../middlewares/security";
import {
  listFavorites,
  addFavorite,
  removeFavorite,
} from "../controllers/favoriteController";

const router = Router();

/* ============================================================================
 *  FAVORITES ROUTES
 * ========================================================================== */
router.use(authenticate);

/**
 * GET /api/favorites
 * ▶️ Liste les favoris de l’utilisateur connecté
 */
router.get("/", listFavorites);

/**
 * POST /api/favorites
 * ▶️ Ajouter un projet ou template aux favoris
 * body: { itemId: string, type: "project" | "template" }
 */
router.post("/", addFavorite);

/**
 * DELETE /api/favorites/:id
 * ▶️ Retirer un favori
 */
router.delete("/:id", removeFavorite);

export default router;
