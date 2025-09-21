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
import client from "prom-client";
import { auditLog } from "../services/auditLogService";
import { emitEvent } from "../services/eventBus";

const router = Router();

/* ============================================================================
 * 📊 Prometheus Metrics
 * ========================================================================== */
const counterReplays = new client.Counter({
  name: "uinova_replays_total",
  help: "Nombre total de replays",
  labelNames: ["action", "status"],
});

const histogramReplayDuration = new client.Histogram({
  name: "uinova_replay_duration_ms",
  help: "Durée des replays en millisecondes",
  labelNames: ["status"],
  buckets: [100, 500, 1000, 5000, 10000, 60000, 300000],
});

/* ============================================================================
 * REPLAYS – Auth Required
 * ========================================================================== */
router.use(authenticate);

/**
 * POST /api/replay/:projectId/start
 * ▶️ Démarrer un replay
 */
router.post(
  "/:projectId/start",
  param("projectId").isString().isLength({ min: 5 }).withMessage("id projet invalide"),
  handleValidationErrors,
  async (req, res, next) => {
    const start = Date.now();
    const result = await startReplay(req, res, next);

    counterReplays.inc({ action: "start", status: "running" });
    await auditLog.log(req.user?.id, "REPLAY_STARTED", { projectId: req.params.projectId });
    emitEvent("replay.started", { userId: req.user?.id, projectId: req.params.projectId });

    histogramReplayDuration.labels("running").observe(Date.now() - start);
    return result;
  }
);

/**
 * POST /api/replay/:projectId/stop
 * ▶️ Arrêter un replay
 */
router.post(
  "/:projectId/stop",
  param("projectId").isString().isLength({ min: 5 }),
  handleValidationErrors,
  async (req, res, next) => {
    const start = Date.now();
    const result = await stopReplay(req, res, next);

    counterReplays.inc({ action: "stop", status: "stopped" });
    await auditLog.log(req.user?.id, "REPLAY_STOPPED", { projectId: req.params.projectId });
    emitEvent("replay.stopped", { userId: req.user?.id, projectId: req.params.projectId });

    histogramReplayDuration.labels("stopped").observe(Date.now() - start);
    return result;
  }
);

/**
 * GET /api/replay/:projectId
 * ▶️ Lister les replays d’un projet
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
 * ▶️ Supprimer un replay
 */
router.delete(
  "/:projectId/:replayId",
  param("projectId").isString().isLength({ min: 5 }),
  param("replayId").isString().isLength({ min: 5 }),
  handleValidationErrors,
  async (req, res, next) => {
    const result = await deleteReplay(req, res, next);

    counterReplays.inc({ action: "delete", status: "deleted" });
    await auditLog.log(req.user?.id, "REPLAY_DELETED", {
      projectId: req.params.projectId,
      replayId: req.params.replayId,
    });
    emitEvent("replay.deleted", {
      userId: req.user?.id,
      projectId: req.params.projectId,
      replayId: req.params.replayId,
    });

    return result;
  }
);

/* ============================================================================
 * ADMIN ROUTES – Admin Required
 * ========================================================================== */
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
