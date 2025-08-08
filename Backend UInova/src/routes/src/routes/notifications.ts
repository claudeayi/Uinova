import { Router } from "express";
import { notify, list } from "../controllers/notificationController";
import { auth } from "../middlewares/auth";

const router = Router();

router.post("/", auth, notify);
router.get("/", auth, list);

export default router;
