import { Router } from "express";
import {
  getAllTemplates,
  getTemplateById,
  publishTemplate,
} from "../controllers/templateController";

const router = Router();

router.get("/", getAllTemplates);
router.get("/:id", getTemplateById);
router.post("/", publishTemplate);

export default router;
