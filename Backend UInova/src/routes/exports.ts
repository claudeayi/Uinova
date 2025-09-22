// src/routes/exports.ts
import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import {
  validateExportSave,
  validateExportListQuery,
  handleValidationErrors,
} from "../middlewares/validate";
import {
  saveExport,
  list,
  getOne,
  markFailed,
  markReady,
} from "../controllers/exportController";
import { param, body } from "express-validator";
import { auditLog } from "../services/auditLogService";
import { emitEvent } from "../services/eventBus";
import client from "prom-client";

const router = Router();

/* ============================================================================
 * 📊 Prometheus Metrics
 * ========================================================================== */
const counterExports = new client.Counter({
  name: "uinova_exports_requests_total",
  help: "Nombre total de requêtes exports",
  labelNames: ["route", "status"],
});

const histogramExports = new client.Histogram({
  name: "uinova_exports_latency_ms",
  help: "Latence des routes exports",
  labelNames: ["route", "status"],
  buckets: [50, 100, 200, 500, 1000, 2000, 5000],
});

function withMetrics(route: string, handler: any) {
  return async (req: any, res: any, next: any) => {
    const start = Date.now();
    try {
      await handler(req, res, next);
      const duration = Date.now() - start;

      counterExports.inc({ route, status: "success" });
      histogramExports.labels(route, "success").observe(duration);

      await auditLog.log(req.user?.id, "EXPORT_METRIC", {
        route,
        status: "success",
        latency: duration,
        ip: req.ip,
      });
    } catch (err: any) {
      const duration = Date.now() - start;
      counterExports.inc({ route, status: "error" });
      histogramExports.labels(route, "error").observe(duration);

      await auditLog.log(req.user?.id, "EXPORT_METRIC_ERROR", {
        route,
        status: "error",
        latency: duration,
        ip: req.ip,
        error: err.message,
      });

      throw err;
    }
  };
}

/* ============================================================================
 * EXPORTS ROUTES – nécessite authentification
 * ========================================================================== */
router.use(requireAuth);

/**
 * POST /api/exports/:projectId
 * 🆕 Créer un export projet
 */
router.post(
  "/:projectId",
  param("projectId").isString().isLength({ min: 8 }).withMessage("projectId invalide"),
  validateExportSave,
  handleValidationErrors,
  withMetrics("create", async (req, res, next) => {
    await auditLog.log(req.user?.id, "EXPORT_CREATED", {
      projectId: req.params.projectId,
      ip: req.ip,
    });
    emitEvent("export.created", {
      projectId: req.params.projectId,
      userId: req.user?.id,
      ip: req.ip,
      ts: Date.now(),
    });
    return saveExport(req, res, next);
  })
);

/**
 * POST /api/exports/:projectId/:pageId
 * 🆕 Créer un export page
 */
router.post(
  "/:projectId/:pageId",
  param("projectId").isString().isLength({ min: 8 }).withMessage("projectId invalide"),
  param("pageId").isString().isLength({ min: 8 }).withMessage("pageId invalide"),
  validateExportSave,
  handleValidationErrors,
  withMetrics("create_page", async (req, res, next) => {
    await auditLog.log(req.user?.id, "EXPORT_CREATED", {
      projectId: req.params.projectId,
      pageId: req.params.pageId,
      ip: req.ip,
    });
    emitEvent("export.created", {
      projectId: req.params.projectId,
      pageId: req.params.pageId,
      userId: req.user?.id,
      ip: req.ip,
      ts: Date.now(),
    });
    return saveExport(req, res, next);
  })
);

/**
 * GET /api/exports
 * 📋 Lister les exports
 */
router.get("/", validateExportListQuery, handleValidationErrors, withMetrics("list", list));

/**
 * GET /api/exports/:id
 * 🔎 Détail d’un export
 */
router.get(
  "/:id",
  param("id").isString().isLength({ min: 10 }),
  handleValidationErrors,
  withMetrics("get_one", getOne)
);

/**
 * POST /api/exports/:id/mark-failed
 * ❌ Marquer un export échoué
 */
router.post(
  "/:id/mark-failed",
  param("id").isString().isLength({ min: 10 }),
  body("error").optional().isString().isLength({ max: 500 }),
  handleValidationErrors,
  withMetrics("mark_failed", async (req, res, next) => {
    await auditLog.log(req.user?.id, "EXPORT_FAILED", {
      exportId: req.params.id,
      error: req.body.error,
      ip: req.ip,
    });
    emitEvent("export.failed", {
      exportId: req.params.id,
      error: req.body.error,
      userId: req.user?.id,
      ip: req.ip,
      ts: Date.now(),
    });
    return markFailed(req, res, next);
  })
);

/**
 * POST /api/exports/:id/mark-ready
 * ✅ Marquer un export comme prêt
 */
router.post(
  "/:id/mark-ready",
  param("id").isString().isLength({ min: 10 }),
  body("bundleUrl")
    .isURL().withMessage("bundleUrl doit être une URL valide")
    .matches(/^https:\/\//).withMessage("bundleUrl doit être en HTTPS"),
  body("meta").optional().isObject(),
  handleValidationErrors,
  withMetrics("mark_ready", async (req, res, next) => {
    await auditLog.log(req.user?.id, "EXPORT_READY", {
      exportId: req.params.id,
      bundleUrl: req.body.bundleUrl,
      ip: req.ip,
    });
    emitEvent("export.ready", {
      exportId: req.params.id,
      bundleUrl: req.body.bundleUrl,
      userId: req.user?.id,
      ip: req.ip,
      ts: Date.now(),
    });
    return markReady(req, res, next);
  })
);

/* ============================================================================
 * 📊 Stats & Health
 * ========================================================================== */

/**
 * GET /api/exports/stats
 * 📈 KPIs exports (succès, erreurs, latence)
 */
router.get("/stats", async (_req, res) => {
  const metrics = await client.register.getSingleMetricAsString("uinova_exports_requests_total");
  res.json({
    ok: true,
    service: "exports",
    metrics,
    ts: Date.now(),
  });
});

/**
 * GET /api/exports/health
 * ✅ Health check service exports
 */
router.get("/health", (_req, res) =>
  res.json({
    ok: true,
    service: "exports",
    version: process.env.EXPORTS_VERSION || "1.0.0",
    uptime: process.uptime(),
    ts: Date.now(),
  })
);

export default router;
