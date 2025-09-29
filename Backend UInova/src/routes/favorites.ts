// src/routes/favorites.ts
import { Router } from "express";
import { body, param, query } from "express-validator";
import { authenticate } from "../middlewares/security";
import {
  listFavorites,
  addFavorite,
  removeFavorite,
} from "../controllers/favoriteController";
import { handleValidationErrors } from "../middlewares/validate";
import { auditLog } from "../services/auditLogService";
import { emitEvent } from "../services/eventBus";
import client from "prom-client";

const router = Router();

/* ============================================================================
 * 📊 Prometheus Metrics
 * ========================================================================== */
const counterFavorites = new client.Counter({
  name: "uinova_favorites_total",
  help: "Nombre total d’opérations favorites",
  labelNames: ["action", "type"],
});

const histogramFavorites = new client.Histogram({
  name: "uinova_favorites_latency_ms",
  help: "Latence des opérations favorites",
  labelNames: ["action", "status"],
  buckets: [10, 50, 100, 200, 500, 1000, 2000],
});

function withMetrics(action: string, handler: any) {
  return async (req: any, res: any, next: any) => {
    const start = Date.now();
    try {
      await handler(req, res, next);
      const duration = Date.now() - start;

      counterFavorites.inc({ action, type: req.body?.type || req.query?.type || "unknown" });
      histogramFavorites.labels(action, "success").observe(duration);

      await auditLog.log(req.user?.id, "FAVORITE_METRIC", {
        action,
        latency: duration,
        ip: req.ip,
      });
    } catch (err: any) {
      const duration = Date.now() - start;
      histogramFavorites.labels(action, "error").observe(duration);

      await auditLog.log(req.user?.id, "FAVORITE_ERROR", {
        action,
        error: err.message,
        latency: duration,
        ip: req.ip,
      });

      throw err;
    }
  };
}

/* ============================================================================
 *  FAVORITES ROUTES – nécessite authentification utilisateur
 * ============================================================================
 */
router.use(authenticate);

/**
 * GET /api/favorites
 * ▶️ Liste les favoris de l’utilisateur connecté
 */
router.get(
  "/",
  query("type").optional().isIn(["project", "template"]),
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("pageSize").optional().isInt({ min: 1, max: 100 }).toInt(),
  handleValidationErrors,
  withMetrics("list", listFavorites)
);

/**
 * POST /api/favorites
 * ▶️ Ajouter un projet ou template aux favoris
 */
router.post(
  "/",
  body("itemId").isString().isLength({ min: 5, max: 100 }),
  body("type").isIn(["project", "template"]),
  handleValidationErrors,
  withMetrics("add", async (req, res, next) => {
    const result = await addFavorite(req, res, next);

    await auditLog.log(req.user?.id, "FAVORITE_ADDED", {
      itemId: req.body.itemId,
      type: req.body.type,
      ip: req.ip,
    });
    emitEvent("favorite.added", {
      userId: req.user?.id,
      itemId: req.body.itemId,
      type: req.body.type,
      ip: req.ip,
      ts: Date.now(),
    });

    return result;
  })
);

/**
 * DELETE /api/favorites/:id
 * ▶️ Retirer un favori
 */
router.delete(
  "/:id",
  param("id").isString().isLength({ min: 5 }),
  handleValidationErrors,
  withMetrics("remove", async (req, res, next) => {
    const result = await removeFavorite(req, res, next);

    await auditLog.log(req.user?.id, "FAVORITE_REMOVED", {
      favoriteId: req.params.id,
      ip: req.ip,
    });
    emitEvent("favorite.removed", {
      userId: req.user?.id,
      favoriteId: req.params.id,
      ip: req.ip,
      ts: Date.now(),
    });

    return result;
  })
);

/* ============================================================================
 * 📊 Stats & Health
 * ========================================================================== */

/**
 * GET /api/favorites/stats
 * 📈 KPIs des favoris
 */
router.get("/stats", async (_req, res) => {
  res.json({
    ok: true,
    service: "favorites",
    metrics: {
      favoritesCount: await client.register.getSingleMetricAsString("uinova_favorites_total"),
    },
    ts: Date.now(),
  });
});

/**
 * GET /api/favorites/health
 * ✅ Health check
 */
router.get("/health", (_req, res) =>
  res.json({
    ok: true,
    service: "favorites",
    version: process.env.FAVORITES_VERSION || "1.0.0",
    uptime: process.uptime(),
    ts: Date.now(),
  })
);

export default router;
