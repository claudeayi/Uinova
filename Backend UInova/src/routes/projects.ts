// src/routes/projects.ts
import { Router } from "express";
import { authenticate, authorize } from "../middlewares/security";
import {
  validateProjectIdParam,
  validateProjectCreate,
  validateProjectUpdate,
  handleValidationErrors,
} from "../middlewares/validate";
import { param, query, body } from "express-validator";
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
  listTrendingProjects,
  getProjectActivity,
} from "../controllers/projectController";
import client from "prom-client";
import { auditLog } from "../services/auditLogService";
import { emitEvent } from "../services/eventBus";

const router = Router();

/* ============================================================================
 * 📊 Prometheus Metrics
 * ========================================================================== */
const counterProjects = new client.Counter({
  name: "uinova_projects_actions_total",
  help: "Nombre d’actions effectuées sur les projets",
  labelNames: ["action"],
});

const histogramProjects = new client.Histogram({
  name: "uinova_projects_latency_ms",
  help: "Latence des opérations sur les projets",
  labelNames: ["action", "status"],
  buckets: [20, 50, 100, 200, 500, 1000, 2000, 5000],
});

function withMetrics(action: string, handler: any) {
  return async (req: any, res: any, next: any) => {
    const start = Date.now();
    try {
      const result = await handler(req, res, next);
      counterProjects.inc({ action });
      histogramProjects.labels(action, "success").observe(Date.now() - start);
      return result;
    } catch (err) {
      histogramProjects.labels(action, "error").observe(Date.now() - start);
      throw err;
    }
  };
}

/* ============================================================================
 *  PROJECT ROUTES – User Auth Required
 * ========================================================================== */
router.use(authenticate);

/**
 * GET /api/projects
 * ▶️ Liste paginée des projets de l'utilisateur
 */
router.get(
  "/",
  withMetrics("list", async (req, res, next) => {
    const result = await listProjects(req, res, next);
    return result;
  })
);

/**
 * GET /api/projects/recent
 * ▶️ Derniers projets mis à jour
 */
router.get("/recent", withMetrics("recent", listRecentProjects));

/**
 * GET /api/projects/favorites
 * ▶️ Projets favoris de l'utilisateur
 */
router.get("/favorites", withMetrics("favorites", listFavoriteProjects));

/**
 * GET /api/projects/trending
 * ▶️ Projets populaires
 */
router.get("/trending", withMetrics("trending", listTrendingProjects));

/**
 * GET /api/projects/:id
 * ▶️ Détail d’un projet
 */
router.get(
  "/:id",
  validateProjectIdParam,
  handleValidationErrors,
  withMetrics("get", getProject)
);

/**
 * POST /api/projects
 * ▶️ Créer un projet
 */
router.post(
  "/",
  validateProjectCreate,
  handleValidationErrors,
  withMetrics("create", async (req, res, next) => {
    const result = await createProject(req, res, next);
    await auditLog.log(req.user?.id, "PROJECT_CREATED", { data: req.body });
    emitEvent("project.created", { userId: req.user?.id, project: req.body });
    return result;
  })
);

/**
 * PATCH /api/projects/:id
 * ▶️ Mettre à jour un projet
 */
router.patch(
  "/:id",
  validateProjectIdParam,
  validateProjectUpdate,
  handleValidationErrors,
  withMetrics("update", async (req, res, next) => {
    const result = await updateProject(req, res, next);
    await auditLog.log(req.user?.id, "PROJECT_UPDATED", { id: req.params.id, changes: req.body });
    emitEvent("project.updated", { id: req.params.id, changes: req.body });
    return result;
  })
);

/**
 * DELETE /api/projects/:id
 * ▶️ Supprimer un projet
 */
router.delete(
  "/:id",
  validateProjectIdParam,
  handleValidationErrors,
  withMetrics("delete", async (req, res, next) => {
    const result = await removeProject(req, res, next);
    await auditLog.log(req.user?.id, "PROJECT_DELETED", { id: req.params.id });
    emitEvent("project.deleted", { id: req.params.id, userId: req.user?.id });
    return result;
  })
);

/* ============================================================================
 *  EXTENDED ROUTES
 * ========================================================================== */

/**
 * POST /api/projects/:id/duplicate
 * ▶️ Dupliquer un projet
 */
router.post(
  "/:id/duplicate",
  validateProjectIdParam,
  handleValidationErrors,
  withMetrics("duplicate", async (req, res, next) => {
    const result = await duplicateProject(req, res, next);
    await auditLog.log(req.user?.id, "PROJECT_DUPLICATED", { id: req.params.id });
    emitEvent("project.duplicated", { id: req.params.id, userId: req.user?.id });
    return result;
  })
);

/**
 * POST /api/projects/:id/publish
 * ▶️ Publier un projet
 */
router.post(
  "/:id/publish",
  validateProjectIdParam,
  handleValidationErrors,
  withMetrics("publish", async (req, res, next) => {
    const result = await publishProject(req, res, next);
    await auditLog.log(req.user?.id, "PROJECT_PUBLISHED", { id: req.params.id });
    emitEvent("project.published", { id: req.params.id, userId: req.user?.id });
    return result;
  })
);

/**
 * POST /api/projects/:id/share
 * ▶️ Générer un lien de partage
 */
router.post(
  "/:id/share",
  validateProjectIdParam,
  handleValidationErrors,
  withMetrics("share", async (req, res, next) => {
    const result = await shareProject(req, res, next);
    await auditLog.log(req.user?.id, "PROJECT_SHARED", { id: req.params.id });
    emitEvent("project.shared", { id: req.params.id, userId: req.user?.id });
    return result;
  })
);

/**
 * GET /api/projects/:id/stats
 * ▶️ Statistiques projet
 */
router.get(
  "/:id/stats",
  param("id").isString().isLength({ min: 5 }).withMessage("id projet invalide"),
  handleValidationErrors,
  withMetrics("stats", getProjectStats)
);

/**
 * GET /api/projects/:id/activity
 * ▶️ Historique d’activité
 */
router.get(
  "/:id/activity",
  param("id").isString().isLength({ min: 5 }),
  handleValidationErrors,
  withMetrics("activity", getProjectActivity)
);

/* ============================================================================
 *  COLLABORATION ROUTES
 * ========================================================================== */

/**
 * POST /api/projects/:id/collaborators
 * ▶️ Ajouter un collaborateur (par email ou userId)
 */
router.post(
  "/:id/collaborators",
  param("id").isString().isLength({ min: 5 }),
  body("userId").optional().isString(),
  body("email").optional().isEmail(),
  body("role").optional().isIn(["VIEWER", "EDITOR"]),
  handleValidationErrors,
  withMetrics("addCollaborator", async (req, res, next) => {
    const result = await addCollaborator(req, res, next);
    await auditLog.log(req.user?.id, "PROJECT_COLLABORATOR_ADDED", { id: req.params.id, collaborator: req.body });
    emitEvent("project.collaborator.added", { id: req.params.id, collaborator: req.body });
    return result;
  })
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
  withMetrics("removeCollaborator", async (req, res, next) => {
    const result = await removeCollaborator(req, res, next);
    await auditLog.log(req.user?.id, "PROJECT_COLLABORATOR_REMOVED", {
      id: req.params.id,
      userId: req.params.userId,
    });
    emitEvent("project.collaborator.removed", { id: req.params.id, userId: req.params.userId });
    return result;
  })
);

/* ============================================================================
 *  ADMIN ROUTES
 * ========================================================================== */

/**
 * GET /api/projects/admin/all
 * ▶️ Lister tous les projets (admin)
 */
router.get(
  "/admin/all",
  authorize(["ADMIN"]),
  query("q").optional().isString(),
  query("status").optional().isIn(["EN_COURS", "TERMINE", "PLANIFIE"]),
  handleValidationErrors,
  withMetrics("admin_list", async (req, res, next) => {
    const result = await listProjects(req, res, next);
    await auditLog.log(req.user?.id, "ADMIN_PROJECTS_LISTED", { filters: req.query });
    return result;
  })
);

export default router;
