import { Router } from "express";
import { authenticate } from "../middlewares/security";
import { getMetrics, getLogs, getHealth } from "../controllers/monitoringController";

const router = Router();

// ⚡ Protégé (seulement admin ou premium)
router.get("/metrics", authenticate, getMetrics);
router.get("/logs", authenticate, getLogs);
router.get("/health", authenticate, getHealth);

export default router;
