// src/routes/projects.ts
import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
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
} from "../controllers/projectController";

const router = Router();

// Toutes les routes "projects" nécessitent d'être connecté
router.use(requireAuth);

/**
 * Lister tous les projets de l'utilisateur
 * GET /api/projects
 */
router.get("/", listProjects);

/**
 * Récupérer un projet précis
 * GET /api/projects/:id
 */
router.get("/:id", validateProjectIdParam, handleValidationErrors, getProject);

/**
 * Créer un nouveau projet
 * POST /api/projects
 */
router.post(
  "/",
  validateProjectCreate,
  handleValidationErrors,
  createProject
);

/**
 * Mettre à jour un projet
 * PUT /api/projects/:id
 */
router.put(
  "/:id",
  validateProjectIdParam,
  validateProjectUpdate,
  handleValidationErrors,
  updateProject
);

/**
 * Supprimer un projet
 * DELETE /api/projects/:id
 */
router.delete(
  "/:id",
  validateProjectIdParam,
  handleValidationErrors,
  removeProject
);

export default router;
