// src/routes/replay.ts
import { Router } from "express";
import {
  startReplay,
  stopReplay,
  listReplays,
  getReplay,
  deleteReplay,
  listAllReplays,
} from "../controllers/replayController";
import { authenticate, authorize } from "../middlewares/security";

const router = Router();

/* ============================================================================
 *  ROUTES REPLAYS – utilisateur authentifié
 * ========================================================================== */
router.use(authenticate);

// Démarrer un replay
router.post("/:projectId/start", startReplay);

// Arrêter un replay
router.post("/:projectId/stop", stopReplay);

// Lister les replays d’un projet
router.get("/:projectId", listReplays);

// Détail d’un replay
router.get("/:projectId/:replayId", getReplay);

// Supprimer un replay (owner ou admin)
router.delete("/:projectId/:replayId", deleteReplay);

/* ============================================================================
 *  ROUTES ADMIN REPLAYS
 * ========================================================================== */
router.get("/admin/replays", authorize(["admin"]), listAllReplays);

export default router;
