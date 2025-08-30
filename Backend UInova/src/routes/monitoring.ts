import { Router } from "express";
import {
  getMetrics,
  getPrometheusMetrics,
  getLogs,
  getHealth,
} from "../controllers/monitoringController";

const router = Router();

// ✅ Monitoring JSON
router.get("/metrics", getMetrics);

// ✅ Monitoring Prometheus (scraping)
router.get("/prometheus", getPrometheusMetrics);

// ✅ Audit logs (dernier 50 logs + user lié)
router.get("/logs", getLogs);

// ✅ Health check détaillé
router.get("/health", getHealth);

export default router;
