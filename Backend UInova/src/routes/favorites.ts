import { Router } from "express";
import { body, param } from "express-validator";
import { authenticate } from "../middlewares/security";
import {
  listFavorites,
  addFavorite,
  removeFavorite,
} from "../controllers/favoriteController";
import { handleValidationErrors } from "../middlewares/validate";

const router = Router();

/* ============================================================================
 *  FAVORITES ROUTES – User Auth Required
 * ============================================================================
 */
router.use(authenticate);

/**
 * GET /api/favorites
 * ▶️ Liste les favoris de l’utilisateur connecté
 * Query: ?type=project|template&page=1&pageSize=20
 */
router.get("/", listFavorites);

/**
 * POST /api/favorites
 * ▶️ Ajouter un projet ou template aux favoris
 * Body:
 * {
 *   itemId: string,         // ID du projet ou template
 *   type: "project"|"template"
 * }
 */
router.post(
  "/",
  body("itemId")
    .isString()
    .isLength({ min: 5 })
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
 */
router.delete(
  "/:id",
  param("id").isString().withMessage("id invalide"),
  handleValidationErrors,
  removeFavorite
);

export default router;
