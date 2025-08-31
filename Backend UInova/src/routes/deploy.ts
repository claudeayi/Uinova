// src/routes/deploy.ts
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
 *  DEPLOYMENT ROUTES – utilisateur authentifié
 * ========================================================================== */
router.use(authenticate);

// 🚀 Lancer un déploiement (user sur son projet, admin sur tout projet)
router.post("/:projectId", validateBody(deploySchema), startDeployment);

// 📊 Statut actuel d’un déploiement
router.get("/:projectId/status", getDeploymentStatus);

// 🕒 Historique des déploiements d’un projet
router.get("/:projectId/history", getDeploymentHistory);

// ❌ Annuler un déploiement en cours
router.delete("/:projectId/cancel", cancelDeployment);

// 🔄 Relancer le dernier déploiement échoué
router.post("/:projectId/restart", restartDeployment);

/* ============================================================================
 *  ADMIN ROUTES – accessibles uniquement aux administrateurs
 * ========================================================================== */
router.get("/admin/deployments", authorize(["admin"]), listAllDeployments);

export default router;
