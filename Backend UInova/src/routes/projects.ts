// src/routes/projects.ts
import { Router } from "express";
import { authenticate, authorize } from "../middlewares/security";
import {
  validateProjectIdParam,
  validateProjectCreate,
  validateProjectUpdate,
  handleValidationErrors,
} from "../middlewares/validate";
import {
  listProjects,
  getProject,
  createProject,
  updateProject,
  removeProject,
  duplicateProject,
  publishProject,
  shareProject,
} from "../controllers/projectController";

const router = Router();

/* ============================================================================
 *  PROJECT ROUTES – nécessite authentification
 * ========================================================================== */
router.use(authenticate);

/**
 * GET /api/projects
 * Lister tous les projets de l'utilisateur connecté
 */
router.get("/", listProjects);

/**
 * GET /api/projects/:id
 * Récupérer un projet précis
 */
router.get("/:id", validateProjectIdParam, handleValidationErrors, getProject);

/**
 * POST /api/projects
 * Créer un nouveau projet
 */
router.post("/", validateProjectCreate, handleValidationErrors, createProject);

/**
 * PATCH /api/projects/:id
 * Mettre à jour un projet (partiellement)
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
 * Supprimer un projet
 */
router.delete("/:id", validateProjectIdParam, handleValidationErrors, removeProject);

/* ============================================================================
 *  EXTENDED ROUTES – pour actions spécifiques
 * ========================================================================== */

/**
 * POST /api/projects/:id/duplicate
 * Dupliquer un projet existant
 */
router.post("/:id/duplicate", validateProjectIdParam, handleValidationErrors, duplicateProject);

/**
 * POST /api/projects/:id/publish
 * Publier/déployer un projet (simple flag, pas le déploiement Docker)
 */
router.post("/:id/publish", validateProjectIdParam, handleValidationErrors, publishProject);

/**
 * POST /api/projects/:id/share
 * Générer un lien de partage public
 */
router.post("/:id/share", validateProjectIdParam, handleValidationErrors, shareProject);

/* ============================================================================
 *  ADMIN ROUTES – gestion globale des projets
 * ========================================================================== */
router.get("/admin/all", authorize(["admin"]), listProjects);

export default router;
