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
 * 📊 Metrics Prometheus
 * ========================================================================== */
const counterProjects = new client.Counter({
  name: "uinova_projects_actions_total",
  help: "Nombre d’actions effectuées sur les projets",
  labelNames: ["action"],
});

/* ============================================================================
 *  PROJECT ROUTES – User Auth Required
 * ========================================================================== */
router.use(authenticate);

router.get("/", async (req, res, next) => {
  const result = await listProjects(req, res, next);
  counterProjects.inc({ action: "list" });
  return result;
});

router.get("/recent", listRecentProjects);
router.get("/favorites", listFavoriteProjects);
router.get("/trending", listTrendingProjects);

router.get("/:id", validateProjectIdParam, handleValidationErrors, getProject);

router.post("/", validateProjectCreate, handleValidationErrors, async (req, res, next) => {
  const result = await createProject(req, res, next);
  counterProjects.inc({ action: "create" });
  await auditLog.log(req.user?.id, "PROJECT_CREATED", { data: req.body });
  emitEvent("project.created", { userId: req.user?.id, project: req.body });
  return result;
});

router.patch(
  "/:id",
  validateProjectIdParam,
  validateProjectUpdate,
  handleValidationErrors,
  async (req, res, next) => {
    const result = await updateProject(req, res, next);
    counterProjects.inc({ action: "update" });
    await auditLog.log(req.user?.id, "PROJECT_UPDATED", { id: req.params.id, changes: req.body });
    emitEvent("project.updated", { id: req.params.id, changes: req.body });
    return result;
  }
);

router.delete("/:id", validateProjectIdParam, handleValidationErrors, async (req, res, next) => {
  const result = await removeProject(req, res, next);
  counterProjects.inc({ action: "delete" });
  await auditLog.log(req.user?.id, "PROJECT_DELETED", { id: req.params.id });
  emitEvent("project.deleted", { id: req.params.id, userId: req.user?.id });
  return result;
});

/* ============================================================================
 *  EXTENDED ROUTES
 * ========================================================================== */
router.post("/:id/duplicate", validateProjectIdParam, handleValidationErrors, async (req, res, next) => {
  const result = await duplicateProject(req, res, next);
  counterProjects.inc({ action: "duplicate" });
  await auditLog.log(req.user?.id, "PROJECT_DUPLICATED", { id: req.params.id });
  emitEvent("project.duplicated", { id: req.params.id, userId: req.user?.id });
  return result;
});

router.post("/:id/publish", validateProjectIdParam, handleValidationErrors, async (req, res, next) => {
  const result = await publishProject(req, res, next);
  counterProjects.inc({ action: "publish" });
  await auditLog.log(req.user?.id, "PROJECT_PUBLISHED", { id: req.params.id });
  emitEvent("project.published", { id: req.params.id, userId: req.user?.id });
  return result;
});

router.post("/:id/share", validateProjectIdParam, handleValidationErrors, async (req, res, next) => {
  const result = await shareProject(req, res, next);
  counterProjects.inc({ action: "share" });
  await auditLog.log(req.user?.id, "PROJECT_SHARED", { id: req.params.id });
  emitEvent("project.shared", { id: req.params.id, userId: req.user?.id });
  return result;
});

router.get(
  "/:id/stats",
  param("id").isString().isLength({ min: 5 }).withMessage("id projet invalide"),
  handleValidationErrors,
  getProjectStats
);

router.get(
  "/:id/activity",
  param("id").isString().isLength({ min: 5 }),
  handleValidationErrors,
  getProjectActivity
);

/* ============================================================================
 *  COLLABORATION ROUTES
 * ========================================================================== */
router.post(
  "/:id/collaborators",
  param("id").isString().isLength({ min: 5 }),
  body("userId").optional().isString(),
  body("email").optional().isEmail(),
  body("role").optional().isIn(["VIEWER", "EDITOR"]),
  handleValidationErrors,
  async (req, res, next) => {
    const result = await addCollaborator(req, res, next);
    counterProjects.inc({ action: "addCollaborator" });
    await auditLog.log(req.user?.id, "PROJECT_COLLABORATOR_ADDED", { id: req.params.id, collaborator: req.body });
    emitEvent("project.collaborator.added", { id: req.params.id, collaborator: req.body });
    return result;
  }
);

router.delete(
  "/:id/collaborators/:userId",
  param("id").isString().isLength({ min: 5 }),
  param("userId").isString().isLength({ min: 5 }),
  handleValidationErrors,
  async (req, res, next) => {
    const result = await removeCollaborator(req, res, next);
    counterProjects.inc({ action: "removeCollaborator" });
    await auditLog.log(req.user?.id, "PROJECT_COLLABORATOR_REMOVED", {
      id: req.params.id,
      userId: req.params.userId,
    });
    emitEvent("project.collaborator.removed", { id: req.params.id, userId: req.params.userId });
    return result;
  }
);

/* ============================================================================
 *  ADMIN ROUTES
 * ========================================================================== */
router.get(
  "/admin/all",
  authorize(["ADMIN"]),
  query("q").optional().isString(),
  query("status").optional().isIn(["EN_COURS", "TERMINE", "PLANIFIE"]),
  handleValidationErrors,
  async (req, res, next) => {
    const result = await listProjects(req, res, next);
    counterProjects.inc({ action: "admin_list" });
    await auditLog.log(req.user?.id, "ADMIN_PROJECTS_LISTED", { filters: req.query });
    return result;
  }
);

export default router;
