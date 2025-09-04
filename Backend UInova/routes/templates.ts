import { Router } from "express";
import { listTemplates, getTemplate } from "../controllers/templateController";

const router = Router();

router.get("/", listTemplates);
router.get("/:id", getTemplate);

export default router;
