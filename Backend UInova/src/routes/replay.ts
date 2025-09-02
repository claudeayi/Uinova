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
import { param, query } from "express-validator";
import { handleValidationErrors } from "../middlewares/validate";

const router = Router();

/* ============================================================================
 *  ROUTES REPLAYS – utilisateur authentifié
 * ========================================================================== */
router.use(authenticate);

/**
 * POST /api/replay/:projectId/start
 * ➝ Démarrer un replay pour un projet
 */
router.post(
  "/:projectId/start",
  param("projectId").isString().notEmpty(),
  handleValidationErrors,
  startReplay
);

/**
 * POST /api/replay/:projectId/stop
 * ➝ Arrêter un replay en cours
 */
router.post(
  "/:projectId/stop",
  param("projectId").isString().notEmpty(),
  handleValidationErrors,
  stopReplay
);

/**
 * GET /api/replay/:projectId
 * ➝ Lister les replays d’un projet
 */
router.get(
  "/:projectId",
  param("projectId").isString().notEmpty(),
  query("limit").optional().isInt({ min: 1, max: 100 }),
  handleValidationErrors,
  listReplays
);

/**
 * GET /api/replay/:projectId/:replayId
 * ➝ Obtenir le détail d’un replay
 */
router.get(
  "/:projectId/:replayId",
  param("projectId").isString().notEmpty(),
  param("replayId").isString().notEmpty(),
  handleValidationErrors,
  getReplay
);

/**
 * DELETE /api/replay/:projectId/:replayId
 * ➝ Supprimer un replay (owner ou admin)
 */
router.delete(
  "/:projectId/:replayId",
  param("projectId").isString().notEmpty(),
  param("replayId").isString().notEmpty(),
  handleValidationErrors,
  deleteReplay
);

/* ============================================================================
 *  ROUTES ADMIN REPLAYS
 * ========================================================================== */
/**
 * GET /api/replay/admin/replays
 * ➝ Lister toutes les sessions (admin only)
 */
router.get(
  "/admin/replays",
  authorize(["ADMIN"]),
  query("page").optional().isInt({ min: 1 }),
  query("pageSize").optional().isInt({ min: 1, max: 100 }),
  handleValidationErrors,
  listAllReplays
);

export default router;
