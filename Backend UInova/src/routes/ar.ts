import { Router } from "express";
import { getARPreview } from "../controllers/arController";

const router = Router();

router.get("/preview", getARPreview);

export default router;
