// src/routes/templates.ts
import { Router } from "express";
import { body, param, query } from "express-validator";
import { authenticate, authorize } from "../middlewares/security";
import { handleValidationErrors } from "../middlewares/validate";

import {
  getAllTemplates,
  getTemplateById,
  publishTemplate,
  updateTemplate,
  deleteTemplate,
  listUserTemplates,
  toggleFavoriteTemplate,
} from "../controllers/templateController";

const router = Router();

/* ============================================================================
 *  PUBLIC ROUTES – accessibles sans authentification
 * ========================================================================== */

/**
 * GET /api/templates
 * ▶️ Liste tous les templates (filtrés/paginés)
 * Query: ?q=...&page=1&pageSize=20&category=landing|dashboard
 */
router.get(
  "/",
  query("q").optional().isString().trim(),
  query("category").optional().isString(),
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("pageSize").optional().isInt({ min: 1, max: 100 }).toInt(),
  handleValidationErrors,
  getAllTemplates
);

/**
 * GET /api/templates/:id
 * ▶️ Récupérer le détail d’un template public
 */
router.get(
  "/:id",
  param("id").isString().isLength({ min: 5 }),
  handleValidationErrors,
  getTemplateById
);

/* ============================================================================
 *  USER ROUTES – nécessite authentification
 * ========================================================================== */
router.use(authenticate);

/**
 * POST /api/templates
 * ▶️ Publier un template (USER: pour soi, ADMIN: pour tous)
 */
router.post(
  "/",
  body("name").isString().isLength({ min: 3, max: 100 }).withMessage("Nom invalide"),
  body("category").isString().isLength({ min: 3, max: 50 }).withMessage("Catégorie invalide"),
  body("schema").isObject().withMessage("Schema requis"),
  body("description").optional().isString().isLength({ max: 500 }),
  handleValidationErrors,
  publishTemplate
);

/**
 * PATCH /api/templates/:id
 * ▶️ Mettre à jour un template (auteur ou admin)
 */
router.patch(
  "/:id",
  param("id").isString().isLength({ min: 5 }),
  body("name").optional().isString().isLength({ min: 3, max: 100 }),
  body("category").optional().isString().isLength({ min: 3, max: 50 }),
  body("schema").optional().isObject(),
  body("description").optional().isString().isLength({ max: 500 }),
  handleValidationErrors,
  updateTemplate
);

/**
 * DELETE /api/templates/:id
 * ▶️ Supprimer un template (auteur ou admin)
 */
router.delete(
  "/:id",
  param("id").isString().isLength({ min: 5 }),
  handleValidationErrors,
  deleteTemplate
);

/**
 * GET /api/templates/my
 * ▶️ Liste des templates publiés par l’utilisateur courant
 */
router.get("/my", listUserTemplates);

/**
 * POST /api/templates/:id/favorite
 * ▶️ Ajouter/retirer un template des favoris
 */
router.post(
  "/:id/favorite",
  param("id").isString().isLength({ min: 5 }),
  handleValidationErrors,
  toggleFavoriteTemplate
);

/* ============================================================================
 *  ADMIN ROUTES
 * ========================================================================== */

/**
 * GET /api/templates/admin/all
 * ▶️ Lister tous les templates (y compris privés/brouillons)
 */
router.get("/admin/all", authorize(["ADMIN"]), getAllTemplates);

export default router;
