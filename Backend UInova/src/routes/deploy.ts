// src/routes/deploy.ts
import { Router } from "express";
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
import { deploySchema } from "../validators/deploy.schema";

const router = Router();

/* ============================================================================
 *  DEPLOYMENT ROUTES – utilisateur authentifié
 * ========================================================================== */
router.use(authenticate);

// 🚀 Lancer un déploiement (user sur son projet, admin sur tout projet)
router.post("/:projectId", validateBody(deploySchema), startDeployment);

// 📊 Statut actuel du dernier déploiement
router.get("/:projectId/status", getDeploymentStatus);

// 🕒 Historique complet des déploiements d’un projet
router.get("/:projectId/history", getDeploymentHistory);

// ↩️ Rollback vers une version précédente
router.post("/:projectId/:deployId/rollback", rollbackDeployment);

// 📜 Logs d’un déploiement précis (texte brut)
router.get("/:projectId/:deployId/logs", getDeploymentLogs);

// ❌ Annuler un déploiement en cours (mock)
router.delete("/:projectId/cancel", cancelDeployment);

// 🔄 Relancer le dernier déploiement échoué (mock)
router.post("/:projectId/restart", restartDeployment);

/* ============================================================================
 *  ADMIN ROUTES – accessibles uniquement aux administrateurs
 * ========================================================================== */
router.get("/admin/deployments", authorize(["ADMIN"]), listAllDeployments);

export default router;
