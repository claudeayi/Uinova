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
 * 📊 Prometheus Metrics
 * ========================================================================== */
const counterPages = new client.Counter({
  name: "uinova_pages_actions_total",
  help: "Nombre d’actions effectuées sur les pages",
  labelNames: ["action"],
});

const histogramPages = new client.Histogram({
  name: "uinova_pages_latency_ms",
  help: "Latence des opérations sur les pages",
  labelNames: ["action", "status"],
  buckets: [20, 50, 100, 200, 500, 1000, 2000],
});

function withMetrics(action: string, handler: any) {
  return async (req: any, res: any, next: any) => {
    const start = Date.now();
    try {
      const result = await handler(req, res, next);
      counterPages.inc({ action });
      histogramPages.labels(action, "success").observe(Date.now() - start);
      return result;
    } catch (err) {
      histogramPages.labels(action, "error").observe(Date.now() - start);
      throw err;
    }
  };
}

/* ============================================================================
 *  PAGES ROUTES – nécessite authentification
 * ========================================================================== */
router.use(authenticate);

/* ---------------- PAR PROJET ---------------- */
router.get(
  "/projects/:projectId/pages",
  validateProjectIdParam,
  handleValidationErrors,
  withMetrics("list", async (req, res, next) => {
    const result = await list(req, res, next);
    await auditLog.log(req.user?.id, "PAGE_LIST", { projectId: req.params.projectId });
    return result;
  })
);

router.post(
  "/projects/:projectId/pages",
  validateProjectIdParam,
  validatePageCreate,
  handleValidationErrors,
  withMetrics("create", async (req, res, next) => {
    const result = await create(req, res, next);
    await auditLog.log(req.user?.id, "PAGE_CREATED", { projectId: req.params.projectId, data: req.body });
    emitEvent("page.created", { projectId: req.params.projectId, userId: req.user?.id });
    return result;
  })
);

router.post(
  "/projects/:projectId/pages/reorder",
  validateProjectIdParam,
  validatePagesReorder,
  handleValidationErrors,
  withMetrics("reorder", async (req, res, next) => {
    const result = await reorder(req, res, next);
    await auditLog.log(req.user?.id, "PAGE_REORDERED", { projectId: req.params.projectId, order: req.body.items });
    emitEvent("page.reordered", { projectId: req.params.projectId, order: req.body.items });
    return result;
  })
);

/* ---------------- PAR PAGE ---------------- */
router.get(
  "/pages/:id",
  validatePageIdParam,
  handleValidationErrors,
  withMetrics("get", get)
);

router.patch(
  "/pages/:id",
  validatePageIdParam,
  validatePageUpdate,
  handleValidationErrors,
  withMetrics("update", async (req, res, next) => {
    const result = await update(req, res, next);
    await auditLog.log(req.user?.id, "PAGE_UPDATED", { pageId: req.params.id, changes: req.body });
    emitEvent("page.updated", { id: req.params.id, userId: req.user?.id });
    return result;
  })
);

router.post(
  "/pages/:id/duplicate",
  validatePageIdParam,
  handleValidationErrors,
  withMetrics("duplicate", async (req, res, next) => {
    const result = await duplicate(req, res, next);
    await auditLog.log(req.user?.id, "PAGE_DUPLICATED", { pageId: req.params.id });
    emitEvent("page.duplicated", { id: req.params.id, userId: req.user?.id });
    return result;
  })
);

router.delete(
  "/pages/:id",
  validatePageIdParam,
  handleValidationErrors,
  withMetrics("delete", async (req, res, next) => {
    const result = await remove(req, res, next);
    await auditLog.log(req.user?.id, "PAGE_DELETED", { pageId: req.params.id });
    emitEvent("page.deleted", { id: req.params.id, userId: req.user?.id });
    return result;
  })
);

/* ---------------- EXTENSIONS ---------------- */
router.get("/pages/:id/preview", validatePageIdParam, handleValidationErrors, preview);

router.post(
  "/pages/:id/publish",
  validatePageIdParam,
  handleValidationErrors,
  withMetrics("publish", async (req, res, next) => {
    const result = await publish(req, res, next);
    await auditLog.log(req.user?.id, "PAGE_PUBLISHED", { pageId: req.params.id });
    emitEvent("page.published", { id: req.params.id, userId: req.user?.id });
    return result;
  })
);

router.post(
  "/pages/:id/unpublish",
  validatePageIdParam,
  handleValidationErrors,
  withMetrics("unpublish", async (req, res, next) => {
    const result = await unpublish(req, res, next);
    await auditLog.log(req.user?.id, "PAGE_UNPUBLISHED", { pageId: req.params.id });
    emitEvent("page.unpublished", { id: req.params.id, userId: req.user?.id });
    return result;
  })
);

/* ---------------- ANALYTICS & VERSIONING ---------------- */
router.get(
  "/pages/:id/stats",
  param("id").isString().isLength({ min: 5 }),
  handleValidationErrors,
  withMetrics("stats", getPageStats)
);

router.get(
  "/pages/:id/versions",
  validatePageIdParam,
  handleValidationErrors,
  withMetrics("listVersions", listVersions)
);

router.post(
  "/pages/:id/restore/:versionId",
  validatePageIdParam,
  param("versionId").isString().isLength({ min: 5 }),
  handleValidationErrors,
  withMetrics("restore", async (req, res, next) => {
    const result = await restoreVersion(req, res, next);
    await auditLog.log(req.user?.id, "PAGE_VERSION_RESTORED", {
      pageId: req.params.id,
      versionId: req.params.versionId,
    });
    emitEvent("page.restored", { id: req.params.id, versionId: req.params.versionId });
    return result;
  })
);

/* ---------------- COLLABORATION & FAVORIS ---------------- */
router.post(
  "/pages/:id/collaborators",
  validatePageIdParam,
  body("userId").isString().withMessage("userId requis"),
  handleValidationErrors,
  withMetrics("addCollaborator", async (req, res, next) => {
    const result = await addCollaborator(req, res, next);
    await auditLog.log(req.user?.id, "PAGE_COLLABORATOR_ADDED", { pageId: req.params.id, userId: req.body.userId });
    emitEvent("page.collaborator.added", { id: req.params.id, userId: req.body.userId });
    return result;
  })
);

router.delete(
  "/pages/:id/collaborators/:userId",
  validatePageIdParam,
  param("userId").isString().isLength({ min: 5 }),
  handleValidationErrors,
  withMetrics("removeCollaborator", async (req, res, next) => {
    const result = await removeCollaborator(req, res, next);
    await auditLog.log(req.user?.id, "PAGE_COLLABORATOR_REMOVED", {
      pageId: req.params.id,
      userId: req.params.userId,
    });
    emitEvent("page.collaborator.removed", { id: req.params.id, userId: req.params.userId });
    return result;
  })
);

router.post(
  "/pages/:id/favorite",
  validatePageIdParam,
  handleValidationErrors,
  withMetrics("favorite", async (req, res, next) => {
    const result = await markAsFavorite(req, res, next);
    await auditLog.log(req.user?.id, "PAGE_FAVORITED", { pageId: req.params.id });
    emitEvent("page.favorited", { id: req.params.id, userId: req.user?.id });
    return result;
  })
);

router.delete(
  "/pages/:id/favorite",
  validatePageIdParam,
  handleValidationErrors,
  withMetrics("unfavorite", async (req, res, next) => {
    const result = await unmarkAsFavorite(req, res, next);
    await auditLog.log(req.user?.id, "PAGE_UNFAVORITED", { pageId: req.params.id });
    emitEvent("page.unfavorited", { id: req.params.id, userId: req.user?.id });
    return result;
  })
);

export default router;
