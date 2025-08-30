import { Router } from "express";
import {
  startDeployment,
  getDeploymentStatus,
  getDeploymentHistory,
} from "../controllers/deployController";
import { authenticate } from "../middlewares/security";

const router = Router();

// ⚡ Toutes les routes nécessitent auth
router.post("/:projectId", authenticate, startDeployment);
router.get("/:projectId/status", authenticate, getDeploymentStatus);
router.get("/:projectId/history", authenticate, getDeploymentHistory);

export default router;
