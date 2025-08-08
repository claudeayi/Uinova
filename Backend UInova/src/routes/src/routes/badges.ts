import { Router } from "express";
import { give, list } from "../controllers/badgeController";
import { auth } from "../middlewares/auth";

const router = Router();

router.post("/", auth, give);
router.get("/", auth, list);

export default router;
