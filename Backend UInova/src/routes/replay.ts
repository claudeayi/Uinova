import { Router } from "express";
import {
  startReplay,
  stopReplay,
  listReplays,
  getReplay,
} from "../controllers/replayController";
import { authenticate } from "../middlewares/security";

const router = Router();

// ⚡ Auth obligatoire
router.post("/:projectId/start", authenticate, startReplay);
router.post("/:projectId/stop", authenticate, stopReplay);
router.get("/:projectId", authenticate, listReplays);
router.get("/:projectId/:replayId", authenticate, getReplay);

export default router;
