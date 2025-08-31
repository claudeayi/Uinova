// src/routes/pages.ts
import { Router } from "express";
import { authenticate, authorize } from "../middlewares/security";
import {
  validateProjectIdParam,
  validatePageIdParam,
  validatePageCreate,
  validatePageUpdate,
  validatePagesReorder,
  handleValidationErrors,
} from "../middlewares/validate";
import {
  list,
  get,
  create,
  update,
  reorder,
  duplicate,
  remove,
  preview,
  publish,
  unpublish,
} from "../controllers/pageController";

const router = Router();

/* ============================================================================
 *  PAGES ROUTES – nécessite authentification
 * ========================================================================== */
router.use(authenticate);

/**
 * GET /api/projects/:projectId/pages
 * Lister toutes les pages d’un projet
 */
router.get(
  "/projects/:projectId/pages",
  validateProjectIdParam,
  handleValidationErrors,
  list
);

/**
 * POST /api/projects/:projectId/pages
 * Créer une nouvelle page dans un projet
 */
router.post(
  "/projects/:projectId/pages",
  validateProjectIdParam,
  validatePageCreate,
  handleValidationErrors,
  create
);

/**
 * POST /api/projects/:projectId/pages/reorder
 * Réordonner les pages d’un projet
 * Body: { items: [{ id, sortOrder }] }
 */
router.post(
  "/projects/:projectId/pages/reorder",
  validateProjectIdParam,
  validatePagesReorder,
  handleValidationErrors,
  reorder
);

/* ============================================================================
 *  ROUTES PAR PAGE (indépendantes du projet)
 * ========================================================================== */

/**
 * GET /api/pages/:id
 * Obtenir le détail d’une page
 */
router.get("/pages/:id", validatePageIdParam, handleValidationErrors, get);

/**
 * PATCH /api/pages/:id
 * Mettre à jour une page (partiellement)
 */
router.patch(
  "/pages/:id",
  validatePageIdParam,
  validatePageUpdate,
  handleValidationErrors,
  update
);

/**
 * POST /api/pages/:id/duplicate
 * Dupliquer une page
 */
router.post(
  "/pages/:id/duplicate",
  validatePageIdParam,
  handleValidationErrors,
  duplicate
);

/**
 * DELETE /api/pages/:id
 * Supprimer une page
 */
router.delete("/pages/:id", validatePageIdParam, handleValidationErrors, remove);

/* ============================================================================
 *  ROUTES EXTENDUES (Preview / Publication)
 * ========================================================================== */

/**
 * GET /api/pages/:id/preview
 * Prévisualiser une page (JSON/HTML pour LivePreview)
 */
router.get(
  "/pages/:id/preview",
  validatePageIdParam,
  handleValidationErrors,
  preview
);

/**
 * POST /api/pages/:id/publish
 * Publier une page (disponible publiquement)
 */
router.post(
  "/pages/:id/publish",
  validatePageIdParam,
  handleValidationErrors,
  publish
);

/**
 * POST /api/pages/:id/unpublish
 * Retirer une page de la publication
 */
router.post(
  "/pages/:id/unpublish",
  validatePageIdParam,
  handleValidationErrors,
  unpublish
);

export default router;
