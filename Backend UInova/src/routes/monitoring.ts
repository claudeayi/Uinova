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

const router = Router();

/* ============================================================================
 *  PUBLIC MONITORING ROUTES
 *  → Exposées pour l’infrastructure (K8s liveness/readiness probes,
 *    Prometheus/Grafana scraping, load balancers health checks…)
 * ========================================================================== */

/**
 * GET /api/monitoring/metrics
 * ✅ Retourne un JSON avec métriques système + DB
 * Exemple:
 *   { uptime: 12345, memory: { used: 42 }, db: { status: "ok" } }
 */
router.get("/metrics", getMetrics);

/**
 * GET /api/monitoring/prometheus
 * ✅ Format texte Prometheus (scraping Grafana/Prometheus)
 * Exemple:
 *   node_uptime_seconds 12345
 *   db_connections_total 5
 */
router.get("/prometheus", getPrometheusMetrics);

/**
 * GET /api/monitoring/health
 * ✅ Health check détaillé (serveur + DB)
 * Utilisé par Kubernetes `readinessProbe` & `livenessProbe`
 */
router.get("/health", getHealth);

/* ============================================================================
 *  ADMIN MONITORING ROUTES
 *  → Protégées par authentification + rôle admin
 * ========================================================================== */
router.use(authenticate, authorize(["ADMIN"]));

/**
 * GET /api/monitoring/logs?limit=100
 * ✅ Récupère les derniers logs d’audit
 * Query params:
 *   - limit (optionnel, défaut=100, max=500)
 */
router.get(
  "/logs",
  query("limit")
    .optional()
    .isInt({ min: 1, max: 500 })
    .withMessage("limit doit être compris entre 1 et 500"),
  handleValidationErrors,
  getLogs
);

/**
 * GET /api/monitoring/overview
 * ✅ Vue d’ensemble (utilisateurs, projets, uptime, erreurs récentes…)
 * Utilisé dans le dashboard admin
 */
router.get("/overview", getOverview);

export default router;
