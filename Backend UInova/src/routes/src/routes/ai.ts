import { Router } from "express";
import { chat } from "../controllers/aiController";
import { auth } from "../middlewares/auth";

const router = Router();

router.post("/chat", auth, chat);

export default router;
