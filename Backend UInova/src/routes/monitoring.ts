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
 *  MONITORING ROUTES
 * ========================================================================== */

// ✅ Monitoring JSON – métriques système + DB
router.get("/metrics", getMetrics);

// ✅ Monitoring Prometheus (scraping)
router.get("/prometheus", getPrometheusMetrics);

// ✅ Health check détaillé (statut serveur + DB)
router.get("/health", getHealth);

/* ============================================================================
 *  ADMIN ONLY ROUTES
 * ========================================================================== */

// ✅ Audit logs (dernier 100 logs + user lié)
router.get("/logs", authenticate, authorize(["admin"]), getLogs);

// ✅ Overview global (logs count + users + projects + uptime)
router.get("/overview", authenticate, authorize(["admin"]), getOverview);

export default router;
