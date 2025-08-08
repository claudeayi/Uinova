import { Router } from "express";
import { saveExport, list } from "../controllers/exportController";
import { auth } from "../middlewares/auth";

const router = Router();

router.post("/:projectId/:pageId", auth, saveExport);
router.get("/:pageId", auth, list);

export default router;
