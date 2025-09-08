// src/routes/projects.ts
import { Router } from "express";
import { authenticate, authorize } from "../middlewares/security";
import {
  validateProjectIdParam,
  validateProjectCreate,
  validateProjectUpdate,
  handleValidationErrors,
} from "../middlewares/validate";
import { param, query } from "express-validator";
import {
  listProjects,
  getProject,
  createProject,
  updateProject,
  removeProject,
  duplicateProject,
  publishProject,
  shareProject,
  listRecentProjects,
  getProjectStats,
  listFavoriteProjects,
  addCollaborator,
  removeCollaborator,
} from "../controllers/projectController";

const router = Router();

/* ============================================================================
 *  PROJECT ROUTES – nécessite authentification
 * ========================================================================== */
router.use(authenticate);

/**
 * GET /api/projects
 * ▶️ Liste tous les projets de l'utilisateur connecté (paginés + filtres)
 * Query: ?q=&status=&page=&pageSize=
 */
router.get("/", listProjects);

/**
 * GET /api/projects/recent
 * ▶️ Derniers projets mis à jour (dashboard)
 */
router.get("/recent", listRecentProjects);

/**
 * GET /api/projects/favorites
 * ▶️ Liste des projets marqués comme favoris
 */
router.get("/favorites", listFavoriteProjects);

/**
 * GET /api/projects/:id
 * ▶️ Récupérer un projet précis
 */
router.get("/:id", validateProjectIdParam, handleValidationErrors, getProject);

/**
 * POST /api/projects
 * ▶️ Créer un nouveau projet
 */
router.post("/", validateProjectCreate, handleValidationErrors, createProject);

/**
 * PATCH /api/projects/:id
 * ▶️ Mettre à jour un projet (partiellement)
 */
router.patch(
  "/:id",
  validateProjectIdParam,
  validateProjectUpdate,
  handleValidationErrors,
  updateProject
);

/**
 * DELETE /api/projects/:id
 * ▶️ Supprimer un projet
 */
router.delete("/:id", validateProjectIdParam, handleValidationErrors, removeProject);

/* ============================================================================
 *  EXTENDED ROUTES – pour actions spécifiques
 * ========================================================================== */

/**
 * POST /api/projects/:id/duplicate
 * ▶️ Dupliquer un projet existant
 */
router.post("/:id/duplicate", validateProjectIdParam, handleValidationErrors, duplicateProject);

/**
 * POST /api/projects/:id/publish
 * ▶️ Publier/déployer un projet (flag public ou non)
 */
router.post("/:id/publish", validateProjectIdParam, handleValidationErrors, publishProject);

/**
 * POST /api/projects/:id/share
 * ▶️ Générer un lien de partage public
 */
router.post("/:id/share", validateProjectIdParam, handleValidationErrors, shareProject);

/**
 * GET /api/projects/:id/stats
 * ▶️ Statistiques d’un projet (pages, collaborations, dernières modifs)
 */
router.get(
  "/:id/stats",
  param("id").isString().isLength({ min: 5 }).withMessage("id projet invalide"),
  handleValidationErrors,
  getProjectStats
);

/**
 * POST /api/projects/:id/collaborators
 * ▶️ Ajouter un collaborateur (par email ou userId)
 */
router.post(
  "/:id/collaborators",
  param("id").isString().isLength({ min: 5 }),
  query("userId").isString().notEmpty().withMessage("userId requis"),
  handleValidationErrors,
  addCollaborator
);

/**
 * DELETE /api/projects/:id/collaborators/:userId
 * ▶️ Retirer un collaborateur
 */
router.delete(
  "/:id/collaborators/:userId",
  param("id").isString().isLength({ min: 5 }),
  param("userId").isString().isLength({ min: 5 }),
  handleValidationErrors,
  removeCollaborator
);

/* ============================================================================
 *  ADMIN ROUTES – gestion globale des projets
 * ========================================================================== */

/**
 * GET /api/projects/admin/all
 * ▶️ Lister tous les projets (admin only)
 */
router.get("/admin/all", authorize(["ADMIN"]), listProjects);

export default router;
