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
import { param, query } from "express-validator";
import { handleValidationErrors } from "../middlewares/validate";

const router = Router();

/* ============================================================================
 *  ROUTES REPLAYS – User Auth Required
 * ============================================================================
 */
router.use(authenticate);

/**
 * POST /api/replay/:projectId/start
 * ▶️ Démarrer un replay pour un projet
 */
router.post(
  "/:projectId/start",
  param("projectId").isString().isLength({ min: 5 }).withMessage("id projet invalide"),
  handleValidationErrors,
  startReplay
);

/**
 * POST /api/replay/:projectId/stop
 * ▶️ Arrêter un replay en cours
 */
router.post(
  "/:projectId/stop",
  param("projectId").isString().isLength({ min: 5 }),
  handleValidationErrors,
  stopReplay
);

/**
 * GET /api/replay/:projectId
 * ▶️ Lister les replays d’un projet
 * Query: ?limit=10&from=2024-01-01&to=2024-12-31
 */
router.get(
  "/:projectId",
  param("projectId").isString().isLength({ min: 5 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
  query("from").optional().isISO8601().withMessage("Date from invalide"),
  query("to").optional().isISO8601().withMessage("Date to invalide"),
  handleValidationErrors,
  listReplays
);

/**
 * GET /api/replay/:projectId/:replayId
 * ▶️ Obtenir le détail d’un replay
 */
router.get(
  "/:projectId/:replayId",
  param("projectId").isString().isLength({ min: 5 }),
  param("replayId").isString().isLength({ min: 5 }),
  handleValidationErrors,
  getReplay
);

/**
 * DELETE /api/replay/:projectId/:replayId
 * ▶️ Supprimer un replay (owner ou admin)
 */
router.delete(
  "/:projectId/:replayId",
  param("projectId").isString().isLength({ min: 5 }),
  param("replayId").isString().isLength({ min: 5 }),
  handleValidationErrors,
  deleteReplay
);

/* ============================================================================
 *  ADMIN ROUTES – Rôle ADMIN requis
 * ============================================================================
 */

/**
 * GET /api/replay/admin/replays
 * ▶️ Lister toutes les sessions (admin only)
 * Query: ?page=1&pageSize=20&userId=&projectId=&status=
 */
router.get(
  "/admin/replays",
  authorize(["ADMIN"]),
  query("page").optional().isInt({ min: 1 }),
  query("pageSize").optional().isInt({ min: 1, max: 200 }),
  query("userId").optional().isString(),
  query("projectId").optional().isString(),
  query("status").optional().isIn(["RUNNING", "STOPPED", "FAILED"]),
  handleValidationErrors,
  listAllReplays
);

export default router;
