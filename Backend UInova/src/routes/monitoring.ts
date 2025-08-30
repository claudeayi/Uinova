import { Router } from "express";
import { authenticate } from "../middlewares/security";
import {
  getMetrics,
  getPrometheusMetrics,
  getLogs,
  getHealth,
} from "../controllers/monitoringController";

const router = Router();

// ⚡ Protégé (admin/premium recommandé sauf prometheus)
router.get("/metrics", authenticate, getMetrics);
router.get("/logs", authenticate, getLogs);
router.get("/health", authenticate, getHealth);

// ⚡ Endpoint spécial Prometheus (en clair, pas d'auth sinon Prometheus bloque)
router.get("/prometheus", getPrometheusMetrics);

export default router;
