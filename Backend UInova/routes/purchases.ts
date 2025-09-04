import { Router } from "express";
import { authenticate } from "../middlewares/security";
import { listPurchases } from "../controllers/purchaseController";

const router = Router();
router.use(authenticate);

router.get("/", listPurchases);

export default router;
