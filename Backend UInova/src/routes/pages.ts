// src/routes/pages.ts
import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
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
} from "../controllers/pageController";

const router = Router();

// Toutes les routes Pages nécessitent l'authentification
router.use(requireAuth);

/**
 * Lister les pages d’un projet
 * GET /api/projects/:projectId/pages
 */
router.get(
  "/projects/:projectId/pages",
  validateProjectIdParam,
  handleValidationErrors,
  list
);

/**
 * Créer une page dans un projet
 * POST /api/projects/:projectId/pages
 */
router.post(
  "/projects/:projectId/pages",
  validateProjectIdParam,
  validatePageCreate,
  handleValidationErrors,
  create
);

/**
 * Réordonner les pages d’un projet
 * POST /api/projects/:projectId/pages/reorder
 * Body: { items: [{ id, sortOrder }] }
 */
router.post(
  "/projects/:projectId/pages/reorder",
  validateProjectIdParam,
  validatePagesReorder,
  handleValidationErrors,
  reorder
);

/**
 * Obtenir le détail d’une page
 * GET /api/pages/:id
 */
router.get(
  "/pages/:id",
  validatePageIdParam,
  handleValidationErrors,
  get
);

/**
 * Mettre à jour une page
 * PUT /api/pages/:id
 */
router.put(
  "/pages/:id",
  validatePageIdParam,
  validatePageUpdate,
  handleValidationErrors,
  update
);

/**
 * Dupliquer une page
 * POST /api/pages/:id/duplicate
 */
router.post(
  "/pages/:id/duplicate",
  validatePageIdParam,
  handleValidationErrors,
  duplicate
);

/**
 * Supprimer une page
 * DELETE /api/pages/:id
 */
router.delete(
  "/pages/:id",
  validatePageIdParam,
  handleValidationErrors,
  remove
);

export default router;
