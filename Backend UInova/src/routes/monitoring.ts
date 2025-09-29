// src/routes/monitoring.ts
import { Router } from "express";
import {
  getMetrics,
  getPrometheusMetrics,
  getLogs,
  getHealth,
  getOverview,
} from "../controllers/monitoringController";
import { authenticate, authorize } from "../middlewares/security";
import { query } from "express-validator";
import { handleValidationErrors } from "../middlewares/validate";
import client from "prom-client";
import { auditLog } from "../services/auditLogService";
import { emitEvent } from "../services/eventBus";

const router = Router();

/* ============================================================================
 * 📊 Prometheus Metrics
 * ========================================================================== */
const counterMonitoring = new client.Counter({
  name: "uinova_monitoring_total",
  help: "Nombre total d’appels aux routes de monitoring",
  labelNames: ["route", "status"],
});

const histogramMonitoring = new client.Histogram({
  name: "uinova_monitoring_latency_ms",
  help: "Latence des endpoints de monitoring",
  labelNames: ["route", "status"],
  buckets: [10, 50, 100, 200, 500, 1000, 2000],
});

function withMetrics(route: string, handler: any) {
  return async (req: any, res: any, next: any) => {
    const start = Date.now();
    try {
      const result = await handler(req, res, next);
      counterMonitoring.inc({ route, status: "success" });
      histogramMonitoring.labels(route, "success").observe(Date.now() - start);
      return result;
    } catch (err) {
      counterMonitoring.inc({ route, status: "error" });
      histogramMonitoring.labels(route, "error").observe(Date.now() - start);
      throw err;
    }
  };
}

/* ============================================================================
 *  PUBLIC MONITORING ROUTES
 * ========================================================================== */

/**
 * GET /api/monitoring/metrics
 * ✅ JSON avec métriques système + DB
 */
router.get("/metrics", withMetrics("metrics", getMetrics));

/**
 * GET /api/monitoring/prometheus
 * ✅ Format Prometheus (Grafana/Prometheus scraping)
 */
router.get("/prometheus", withMetrics("prometheus", getPrometheusMetrics));

/**
 * GET /api/monitoring/health
 * ✅ Health check détaillé (K8s probes)
 */
router.get(
  "/health",
  withMetrics("health", async (req, res, next) => {
    const result = await getHealth(req, res, next);

    if (!result?.ok) {
      await auditLog.log("system", "MONITORING_HEALTH_FAILED", { result });
      emitEvent("monitoring.health.failed", { ts: Date.now(), result });
    } else {
      await auditLog.log("system", "MONITORING_HEALTH_OK", { ts: Date.now() });
    }

    return result;
  })
);

/* ============================================================================
 *  ADMIN MONITORING ROUTES
 * ========================================================================== */
router.use(authenticate, authorize(["ADMIN"]));

/**
 * GET /api/monitoring/logs
 * ✅ Derniers logs d’audit
 */
router.get(
  "/logs",
  query("limit").optional().isInt({ min: 1, max: 500 }),
  handleValidationErrors,
  withMetrics("logs", async (req, res, next) => {
    const limit = Number(req.query.limit) || 100;
    const result = await getLogs(req, res, next);

    await auditLog.log(req.user?.id, "MONITORING_LOGS_VIEWED", { limit });
    emitEvent("monitoring.logs.viewed", { userId: req.user?.id, limit });

    return result;
  })
);

/**
 * GET /api/monitoring/overview
 * ✅ Vue d’ensemble (admin dashboard)
 */
router.get(
  "/overview",
  withMetrics("overview", async (req, res, next) => {
    const result = await getOverview(req, res, next);

    await auditLog.log(req.user?.id, "MONITORING_OVERVIEW_VIEWED", { ts: Date.now() });
    emitEvent("monitoring.overview.viewed", { userId: req.user?.id, ts: Date.now() });

    return result;
  })
);

export default router;
