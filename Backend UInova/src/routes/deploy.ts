// src/routes/deploy.ts
import { Router } from "express";
import { param } from "express-validator";
import {
  startDeployment,
  getDeploymentStatus,
  getDeploymentHistory,
  rollbackDeployment,
  getDeploymentLogs,
  cancelDeployment,
  restartDeployment,
  listAllDeployments,
} from "../controllers/deployController";
import { authenticate, authorize } from "../middlewares/security";
import { validateBody } from "../middlewares/validator";
import { handleValidationErrors } from "../middlewares/validate";
import { deploySchema } from "../validators/deploy.schema";
import { auditLog } from "../services/auditLogService";
import { emitEvent } from "../services/eventBus";
import client from "prom-client";

const router = Router();

/* ============================================================================
 * 📊 Prometheus Metrics
 * ========================================================================== */
const counterDeploy = new client.Counter({
  name: "uinova_deploy_requests_total",
  help: "Nombre total de requêtes de déploiement",
  labelNames: ["route", "status"],
});

const histogramDeploy = new client.Histogram({
  name: "uinova_deploy_latency_ms",
  help: "Latence des endpoints de déploiement",
  labelNames: ["route", "status"],
  buckets: [50, 100, 200, 500, 1000, 2000, 5000],
});

/* ============================================================================
 *  DEPLOYMENT ROUTES – authentification requise
 * ========================================================================== */
router.use(authenticate);

function withMetrics(route: string, handler: any) {
  return async (req: any, res: any, next: any) => {
    const start = Date.now();
    try {
      await handler(req, res, next);
      counterDeploy.inc({ route, status: "success" });
      histogramDeploy.labels(route, "success").observe(Date.now() - start);
    } catch (err) {
      counterDeploy.inc({ route, status: "error" });
      histogramDeploy.labels(route, "error").observe(Date.now() - start);
      throw err;
    }
  };
}

/**
 * POST /api/deploy/:projectId
 * 🚀 Lancer un déploiement
 */
router.post(
  "/:projectId",
  param("projectId").isString().isLength({ min: 8 }).withMessage("projectId invalide"),
  handleValidationErrors,
  validateBody(deploySchema),
  withMetrics("start", async (req, res, next) => {
    await auditLog.log(req.user?.id, "DEPLOY_START", { projectId: req.params.projectId });
    emitEvent("deploy.started", { projectId: req.params.projectId });
    return startDeployment(req, res, next);
  })
);

/**
 * GET /api/deploy/:projectId/status
 * 📊 Statut du dernier déploiement
 */
router.get(
  "/:projectId/status",
  param("projectId").isString(),
  handleValidationErrors,
  withMetrics("status", getDeploymentStatus)
);

/**
 * GET /api/deploy/:projectId/history
 * 🕒 Historique des déploiements
 */
router.get(
  "/:projectId/history",
  param("projectId").isString(),
  handleValidationErrors,
  withMetrics("history", getDeploymentHistory)
);

/**
 * POST /api/deploy/:projectId/:deployId/rollback
 * ↩️ Rollback
 */
router.post(
  "/:projectId/:deployId/rollback",
  param("projectId").isString(),
  param("deployId").isString(),
  handleValidationErrors,
  withMetrics("rollback", async (req, res, next) => {
    await auditLog.log(req.user?.id, "DEPLOY_ROLLBACK", {
      projectId: req.params.projectId,
      deployId: req.params.deployId,
    });
    emitEvent("deploy.rollback", { projectId: req.params.projectId, deployId: req.params.deployId });
    return rollbackDeployment(req, res, next);
  })
);

/**
 * GET /api/deploy/:projectId/:deployId/logs
 * 📜 Logs détaillés
 */
router.get(
  "/:projectId/:deployId/logs",
  param("projectId").isString(),
  param("deployId").isString(),
  handleValidationErrors,
  withMetrics("logs", getDeploymentLogs)
);

/**
 * DELETE /api/deploy/:projectId/cancel
 * ❌ Annuler un déploiement
 */
router.delete(
  "/:projectId/cancel",
  param("projectId").isString(),
  handleValidationErrors,
  withMetrics("cancel", async (req, res, next) => {
    await auditLog.log(req.user?.id, "DEPLOY_CANCEL", { projectId: req.params.projectId });
    emitEvent("deploy.canceled", { projectId: req.params.projectId });
    return cancelDeployment(req, res, next);
  })
);

/**
 * POST /api/deploy/:projectId/restart
 * 🔄 Relancer un déploiement échoué
 */
router.post(
  "/:projectId/restart",
  param("projectId").isString(),
  handleValidationErrors,
  withMetrics("restart", async (req, res, next) => {
    await auditLog.log(req.user?.id, "DEPLOY_RESTART", { projectId: req.params.projectId });
    emitEvent("deploy.restarted", { projectId: req.params.projectId });
    return restartDeployment(req, res, next);
  })
);

/* ============================================================================
 *  ADMIN ROUTES – réservées aux administrateurs
 * ========================================================================== */
router.get(
  "/admin/deployments",
  authorize(["ADMIN"]),
  withMetrics("admin_list", listAllDeployments)
);

export default router;
