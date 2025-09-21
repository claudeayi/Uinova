// src/routes/pages.ts
import { Router } from "express";
import { authenticate } from "../middlewares/security";
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
import client from "prom-client";
import { auditLog } from "../services/auditLogService";
import { emitEvent } from "../services/eventBus";

const router = Router();

/* ============================================================================
 * 📊 Metrics Prometheus
 * ========================================================================== */
const counterPages = new client.Counter({
  name: "uinova_pages_actions_total",
  help: "Nombre d’actions effectuées sur les pages",
  labelNames: ["action"],
});

/* ============================================================================
 *  PAGES ROUTES – nécessite authentification
 * ========================================================================== */
router.use(authenticate);

/* ---------------- PAR PROJET ---------------- */
router.get(
  "/projects/:projectId/pages",
  validateProjectIdParam,
  handleValidationErrors,
  async (req, res, next) => {
    const result = await list(req, res, next);
    counterPages.inc({ action: "list" });
    await auditLog.log(req.user?.id, "PAGE_LIST", { projectId: req.params.projectId });
    return result;
  }
);

router.post(
  "/projects/:projectId/pages",
  validateProjectIdParam,
  validatePageCreate,
  handleValidationErrors,
  async (req, res, next) => {
    const result = await create(req, res, next);
    counterPages.inc({ action: "create" });
    await auditLog.log(req.user?.id, "PAGE_CREATED", { projectId: req.params.projectId, data: req.body });
    emitEvent("page.created", { projectId: req.params.projectId, userId: req.user?.id });
    return result;
  }
);

router.post(
  "/projects/:projectId/pages/reorder",
  validateProjectIdParam,
  validatePagesReorder,
  handleValidationErrors,
  async (req, res, next) => {
    const result = await reorder(req, res, next);
    counterPages.inc({ action: "reorder" });
    await auditLog.log(req.user?.id, "PAGE_REORDERED", { projectId: req.params.projectId, order: req.body.items });
    emitEvent("page.reordered", { projectId: req.params.projectId, order: req.body.items });
    return result;
  }
);

/* ---------------- PAR PAGE ---------------- */
router.get(
  "/pages/:id",
  validatePageIdParam,
  handleValidationErrors,
  async (req, res, next) => {
    const result = await get(req, res, next);
    counterPages.inc({ action: "get" });
    return result;
  }
);

router.patch(
  "/pages/:id",
  validatePageIdParam,
  validatePageUpdate,
  handleValidationErrors,
  async (req, res, next) => {
    const result = await update(req, res, next);
    counterPages.inc({ action: "update" });
    await auditLog.log(req.user?.id, "PAGE_UPDATED", { pageId: req.params.id, changes: req.body });
    emitEvent("page.updated", { id: req.params.id, userId: req.user?.id });
    return result;
  }
);

router.post(
  "/pages/:id/duplicate",
  validatePageIdParam,
  handleValidationErrors,
  async (req, res, next) => {
    const result = await duplicate(req, res, next);
    counterPages.inc({ action: "duplicate" });
    await auditLog.log(req.user?.id, "PAGE_DUPLICATED", { pageId: req.params.id });
    emitEvent("page.duplicated", { id: req.params.id, userId: req.user?.id });
    return result;
  }
);

router.delete(
  "/pages/:id",
  validatePageIdParam,
  handleValidationErrors,
  async (req, res, next) => {
    const result = await remove(req, res, next);
    counterPages.inc({ action: "delete" });
    await auditLog.log(req.user?.id, "PAGE_DELETED", { pageId: req.params.id });
    emitEvent("page.deleted", { id: req.params.id, userId: req.user?.id });
    return result;
  }
);

/* ---------------- EXTENSIONS ---------------- */
router.get("/pages/:id/preview", validatePageIdParam, handleValidationErrors, preview);

router.post(
  "/pages/:id/publish",
  validatePageIdParam,
  handleValidationErrors,
  async (req, res, next) => {
    const result = await publish(req, res, next);
    counterPages.inc({ action: "publish" });
    await auditLog.log(req.user?.id, "PAGE_PUBLISHED", { pageId: req.params.id });
    emitEvent("page.published", { id: req.params.id, userId: req.user?.id });
    return result;
  }
);

router.post(
  "/pages/:id/unpublish",
  validatePageIdParam,
  handleValidationErrors,
  async (req, res, next) => {
    const result = await unpublish(req, res, next);
    counterPages.inc({ action: "unpublish" });
    await auditLog.log(req.user?.id, "PAGE_UNPUBLISHED", { pageId: req.params.id });
    emitEvent("page.unpublished", { id: req.params.id, userId: req.user?.id });
    return result;
  }
);

/* ---------------- ANALYTICS & VERSIONING ---------------- */
router.get(
  "/pages/:id/stats",
  param("id").isString().isLength({ min: 5 }),
  handleValidationErrors,
  getPageStats
);

router.get("/pages/:id/versions", validatePageIdParam, handleValidationErrors, listVersions);

router.post(
  "/pages/:id/restore/:versionId",
  validatePageIdParam,
  param("versionId").isString().isLength({ min: 5 }),
  handleValidationErrors,
  async (req, res, next) => {
    const result = await restoreVersion(req, res, next);
    counterPages.inc({ action: "restore" });
    await auditLog.log(req.user?.id, "PAGE_VERSION_RESTORED", {
      pageId: req.params.id,
      versionId: req.params.versionId,
    });
    emitEvent("page.restored", { id: req.params.id, versionId: req.params.versionId });
    return result;
  }
);

/* ---------------- COLLABORATION & FAVORIS ---------------- */
router.post(
  "/pages/:id/collaborators",
  validatePageIdParam,
  body("userId").isString().withMessage("userId requis"),
  handleValidationErrors,
  async (req, res, next) => {
    const result = await addCollaborator(req, res, next);
    counterPages.inc({ action: "addCollaborator" });
    await auditLog.log(req.user?.id, "PAGE_COLLABORATOR_ADDED", { pageId: req.params.id, userId: req.body.userId });
    emitEvent("page.collaborator.added", { id: req.params.id, userId: req.body.userId });
    return result;
  }
);

router.delete(
  "/pages/:id/collaborators/:userId",
  validatePageIdParam,
  param("userId").isString().isLength({ min: 5 }),
  handleValidationErrors,
  async (req, res, next) => {
    const result = await removeCollaborator(req, res, next);
    counterPages.inc({ action: "removeCollaborator" });
    await auditLog.log(req.user?.id, "PAGE_COLLABORATOR_REMOVED", {
      pageId: req.params.id,
      userId: req.params.userId,
    });
    emitEvent("page.collaborator.removed", { id: req.params.id, userId: req.params.userId });
    return result;
  }
);

router.post(
  "/pages/:id/favorite",
  validatePageIdParam,
  handleValidationErrors,
  async (req, res, next) => {
    const result = await markAsFavorite(req, res, next);
    counterPages.inc({ action: "favorite" });
    await auditLog.log(req.user?.id, "PAGE_FAVORITED", { pageId: req.params.id });
    emitEvent("page.favorited", { id: req.params.id, userId: req.user?.id });
    return result;
  }
);

router.delete(
  "/pages/:id/favorite",
  validatePageIdParam,
  handleValidationErrors,
  async (req, res, next) => {
    const result = await unmarkAsFavorite(req, res, next);
    counterPages.inc({ action: "unfavorite" });
    await auditLog.log(req.user?.id, "PAGE_UNFAVORITED", { pageId: req.params.id });
    emitEvent("page.unfavorited", { id: req.params.id, userId: req.user?.id });
    return result;
  }
);

export default router;
