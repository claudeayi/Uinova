import { Router } from "express";
import { authenticate } from "../middlewares/security";
import { getUsageReport, getUsageHistory } from "../controllers/billingController";

const router = Router();
router.use(authenticate);

router.get("/report", getUsageReport);
router.get("/history", getUsageHistory);

export default router;
