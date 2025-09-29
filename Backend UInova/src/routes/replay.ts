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
  help: "Nombre total d’opérations sur les replays",
  labelNames: ["action", "status"],
});

const histogramReplayLatency = new client.Histogram({
  name: "uinova_replays_latency_ms",
  help: "Latence des opérations replays en ms",
  labelNames: ["action", "status"],
  buckets: [50, 100, 200, 500, 1000, 5000, 10000],
});

function withMetrics(action: string, handler: any) {
  return async (req: any, res: any, next: any) => {
    const start = Date.now();
    try {
      const result = await handler(req, res, next);
      counterReplays.inc({ action, status: "success" });
      histogramReplayLatency.labels(action, "success").observe(Date.now() - start);
      return result;
    } catch (err) {
      counterReplays.inc({ action, status: "error" });
      histogramReplayLatency.labels(action, "error").observe(Date.now() - start);
      throw err;
    }
  };
}

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
  withMetrics("start", async (req, res, next) => {
    const result = await startReplay(req, res, next);

    await auditLog.log(req.user?.id, "REPLAY_STARTED", { projectId: req.params.projectId });
    emitEvent("replay.started", { userId: req.user?.id, projectId: req.params.projectId });

    return result;
  })
);

/**
 * POST /api/replay/:projectId/stop
 * ▶️ Arrêter un replay
 */
router.post(
  "/:projectId/stop",
  param("projectId").isString().isLength({ min: 5 }),
  handleValidationErrors,
  withMetrics("stop", async (req, res, next) => {
    const result = await stopReplay(req, res, next);

    await auditLog.log(req.user?.id, "REPLAY_STOPPED", { projectId: req.params.projectId });
    emitEvent("replay.stopped", { userId: req.user?.id, projectId: req.params.projectId });

    return result;
  })
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
  withMetrics("list", listReplays)
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
  withMetrics("get", getReplay)
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
  withMetrics("delete", async (req, res, next) => {
    const result = await deleteReplay(req, res, next);

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
  })
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
  withMetrics("admin_list", listAllReplays)
);

export default router; // enrichi sans rien enlever
