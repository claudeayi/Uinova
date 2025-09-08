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
import { param, body } from "express-validator";
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
  getPageStats,
  restoreVersion,
  listVersions,
  addCollaborator,
  removeCollaborator,
  markAsFavorite,
  unmarkAsFavorite,
} from "../controllers/pageController";

const router = Router();

/* ============================================================================
 *  PAGES ROUTES – nécessite authentification
 * ========================================================================== */
router.use(authenticate);

/* ---------------- PAR PROJET ---------------- */

/**
 * GET /api/projects/:projectId/pages
 * ▶️ Lister toutes les pages d’un projet
 */
router.get(
  "/projects/:projectId/pages",
  validateProjectIdParam,
  handleValidationErrors,
  list
);

/**
 * POST /api/projects/:projectId/pages
 * ▶️ Créer une nouvelle page dans un projet
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
 * ▶️ Réordonner les pages d’un projet
 * Body: { items: [{ id, sortOrder }] }
 */
router.post(
  "/projects/:projectId/pages/reorder",
  validateProjectIdParam,
  validatePagesReorder,
  handleValidationErrors,
  reorder
);

/* ---------------- PAR PAGE ---------------- */

/**
 * GET /api/pages/:id
 * ▶️ Obtenir le détail d’une page
 */
router.get("/pages/:id", validatePageIdParam, handleValidationErrors, get);

/**
 * PATCH /api/pages/:id
 * ▶️ Mettre à jour une page
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
 * ▶️ Dupliquer une page
 */
router.post(
  "/pages/:id/duplicate",
  validatePageIdParam,
  handleValidationErrors,
  duplicate
);

/**
 * DELETE /api/pages/:id
 * ▶️ Supprimer une page
 */
router.delete("/pages/:id", validatePageIdParam, handleValidationErrors, remove);

/* ---------------- EXTENSIONS (Preview / Publication) ---------------- */

/**
 * GET /api/pages/:id/preview
 * ▶️ Prévisualiser une page (JSON/HTML pour LivePreview)
 */
router.get("/pages/:id/preview", validatePageIdParam, handleValidationErrors, preview);

/**
 * POST /api/pages/:id/publish
 * ▶️ Publier une page (publique)
 */
router.post("/pages/:id/publish", validatePageIdParam, handleValidationErrors, publish);

/**
 * POST /api/pages/:id/unpublish
 * ▶️ Retirer une page de la publication
 */
router.post("/pages/:id/unpublish", validatePageIdParam, handleValidationErrors, unpublish);

/* ---------------- ANALYTICS & VERSIONING ---------------- */

/**
 * GET /api/pages/:id/stats
 * ▶️ Statistiques d’une page (vues, temps moyen, interactions)
 */
router.get(
  "/pages/:id/stats",
  param("id").isString().isLength({ min: 5 }),
  handleValidationErrors,
  getPageStats
);

/**
 * GET /api/pages/:id/versions
 * ▶️ Liste des versions précédentes (historique sauvegardes)
 */
router.get(
  "/pages/:id/versions",
  validatePageIdParam,
  handleValidationErrors,
  listVersions
);

/**
 * POST /api/pages/:id/restore/:versionId
 * ▶️ Restaurer une version précédente
 */
router.post(
  "/pages/:id/restore/:versionId",
  validatePageIdParam,
  param("versionId").isString().isLength({ min: 5 }),
  handleValidationErrors,
  restoreVersion
);

/* ---------------- COLLABORATION & FAVORIS ---------------- */

/**
 * POST /api/pages/:id/collaborators
 * ▶️ Ajouter un collaborateur à une page
 */
router.post(
  "/pages/:id/collaborators",
  validatePageIdParam,
  body("userId").isString().withMessage("userId requis"),
  handleValidationErrors,
  addCollaborator
);

/**
 * DELETE /api/pages/:id/collaborators/:userId
 * ▶️ Retirer un collaborateur d’une page
 */
router.delete(
  "/pages/:id/collaborators/:userId",
  validatePageIdParam,
  param("userId").isString().isLength({ min: 5 }),
  handleValidationErrors,
  removeCollaborator
);

/**
 * POST /api/pages/:id/favorite
 * ▶️ Marquer une page comme favori
 */
router.post("/pages/:id/favorite", validatePageIdParam, handleValidationErrors, markAsFavorite);

/**
 * DELETE /api/pages/:id/favorite
 * ▶️ Retirer une page des favoris
 */
router.delete("/pages/:id/favorite", validatePageIdParam, handleValidationErrors, unmarkAsFavorite);

export default router;
