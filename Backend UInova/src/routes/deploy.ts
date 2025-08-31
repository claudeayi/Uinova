import { Router } from "express";
import {
  startDeployment,
  getDeploymentStatus,
  getDeploymentHistory,
  cancelDeployment,
  restartDeployment,
  listAllDeployments,
} from "../controllers/deployController";
import { authenticate, authorize } from "../middlewares/security";
import { validateBody } from "../middlewares/validator";
import { deploySchema } from "../validators/deploy.schema";

const router = Router();

/* ============================================================================
 *  DEPLOYMENT ROUTES
 *  Toutes les routes nécessitent authentification
 * ========================================================================== */

// 🚀 Lancer un déploiement (user sur son projet, admin sur tout projet)
router.post(
  "/:projectId",
  authenticate,
  validateBody(deploySchema),
  startDeployment
);

// 📊 Statut actuel d’un déploiement
router.get("/:projectId/status", authenticate, getDeploymentStatus);

// 🕒 Historique des déploiements d’un projet
router.get("/:projectId/history", authenticate, getDeploymentHistory);

// ❌ Annuler un déploiement en cours
router.post("/:projectId/cancel", authenticate, cancelDeployment);

// 🔄 Relancer le dernier déploiement échoué
router.post("/:projectId/restart", authenticate, restartDeployment);

/* ============================================================================
 *  ADMIN ROUTES
 * ========================================================================== */

// 📋 Liste globale de tous les déploiements (admin uniquement)
router.get(
  "/admin/all",
  authenticate,
  authorize(["admin"]),
  listAllDeployments
);

export default router;
