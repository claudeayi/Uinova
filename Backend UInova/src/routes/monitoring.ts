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

const router = Router();

/* ============================================================================
 *  PUBLIC MONITORING ROUTES
 *  Utiles pour l’infra (load balancer, Prometheus, Kubernetes probes…)
 * ========================================================================== */

// ✅ Monitoring JSON – métriques système + DB
router.get("/metrics", getMetrics);

// ✅ Monitoring Prometheus (scraping par Prometheus/Grafana)
router.get("/prometheus", getPrometheusMetrics);

// ✅ Health check détaillé (statut serveur + DB)
router.get("/health", getHealth);

/* ============================================================================
 *  ADMIN MONITORING ROUTES
 *  Protégées par authentification + rôle admin
 * ========================================================================== */
router.use(authenticate, authorize(["admin"]));

// ✅ Audit logs (dernier 100 logs + user lié)
router.get("/logs", getLogs);

// ✅ Overview global (logs count + users + projects + uptime)
router.get("/overview", getOverview);

export default router;
