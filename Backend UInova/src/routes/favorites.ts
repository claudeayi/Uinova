// src/routes/favorites.ts
import { Router } from "express";
import { body, param, query } from "express-validator";
import { authenticate } from "../middlewares/security";
import {
  listFavorites,
  addFavorite,
  removeFavorite,
} from "../controllers/favoriteController";
import { handleValidationErrors } from "../middlewares/validate";

const router = Router();

/* ============================================================================
 *  FAVORITES ROUTES – nécessite authentification utilisateur
 * ============================================================================
 */
router.use(authenticate);

/**
 * GET /api/favorites
 * ▶️ Liste les favoris de l’utilisateur connecté
 * Query params :
 *   - type?: "project" | "template"
 *   - page?: number (par défaut 1)
 *   - pageSize?: number (par défaut 20, max 100)
 */
router.get(
  "/",
  query("type")
    .optional()
    .isIn(["project", "template"])
    .withMessage("type doit être 'project' ou 'template'"),
  query("page")
    .optional()
    .isInt({ min: 1 })
    .toInt()
    .withMessage("page doit être ≥ 1"),
  query("pageSize")
    .optional()
    .isInt({ min: 1, max: 100 })
    .toInt()
    .withMessage("pageSize doit être entre 1 et 100"),
  handleValidationErrors,
  listFavorites
);

/**
 * POST /api/favorites
 * ▶️ Ajouter un projet ou template aux favoris
 * Body:
 * {
 *   itemId: string,              // ID du projet ou template
 *   type: "project" | "template" // type de favori
 * }
 */
router.post(
  "/",
  body("itemId")
    .isString()
    .isLength({ min: 5, max: 100 })
    .withMessage("itemId invalide"),
  body("type")
    .isIn(["project", "template"])
    .withMessage("type doit être 'project' ou 'template'"),
  handleValidationErrors,
  addFavorite
);

/**
 * DELETE /api/favorites/:id
 * ▶️ Retirer un favori (par son ID favori)
 * Param:
 *   - id: string (UUID/cuid ou similaire)
 */
router.delete(
  "/:id",
  param("id")
    .isString()
    .isLength({ min: 5 })
    .withMessage("id invalide"),
  handleValidationErrors,
  removeFavorite
);

export default router;
