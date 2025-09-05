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

const router = Router();

/* ============================================================================
 *  DEPLOYMENT ROUTES – utilisateur authentifié
 * ========================================================================== */
router.use(authenticate);

/**
 * POST /api/deploy/:projectId
 * 🚀 Lancer un déploiement
 */
router.post(
  "/:projectId",
  param("projectId").isString().isLength({ min: 8 }),
  handleValidationErrors,
  validateBody(deploySchema),
  startDeployment
);

/**
 * GET /api/deploy/:projectId/status
 * 📊 Statut du dernier déploiement
 */
router.get(
  "/:projectId/status",
  param("projectId").isString(),
  handleValidationErrors,
  getDeploymentStatus
);

/**
 * GET /api/deploy/:projectId/history
 * 🕒 Historique complet des déploiements d’un projet
 */
router.get(
  "/:projectId/history",
  param("projectId").isString(),
  handleValidationErrors,
  getDeploymentHistory
);

/**
 * POST /api/deploy/:projectId/:deployId/rollback
 * ↩️ Rollback vers une version précédente
 */
router.post(
  "/:projectId/:deployId/rollback",
  param("projectId").isString(),
  param("deployId").isString(),
  handleValidationErrors,
  rollbackDeployment
);

/**
 * GET /api/deploy/:projectId/:deployId/logs
 * 📜 Logs détaillés d’un déploiement
 */
router.get(
  "/:projectId/:deployId/logs",
  param("projectId").isString(),
  param("deployId").isString(),
  handleValidationErrors,
  getDeploymentLogs
);

/**
 * DELETE /api/deploy/:projectId/cancel
 * ❌ Annuler un déploiement en cours
 */
router.delete(
  "/:projectId/cancel",
  param("projectId").isString(),
  handleValidationErrors,
  cancelDeployment
);

/**
 * POST /api/deploy/:projectId/restart
 * 🔄 Relancer le dernier déploiement échoué
 */
router.post(
  "/:projectId/restart",
  param("projectId").isString(),
  handleValidationErrors,
  restartDeployment
);

/* ============================================================================
 *  ADMIN ROUTES – uniquement administrateurs
 * ========================================================================== */
/**
 * GET /api/deploy/admin/deployments
 * 🔐 Lister tous les déploiements
 */
router.get(
  "/admin/deployments",
  authorize(["ADMIN"]),
  listAllDeployments
);

export default router;
