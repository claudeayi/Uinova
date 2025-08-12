// src/routes/ai.ts
import { Router } from "express";
import { chat } from "../controllers/aiController";
import { requireAuth } from "../middlewares/auth";
import { body } from "express-validator";
import { handleValidationErrors } from "../middlewares/validate";

const router = Router();

/**
 * POST /api/ai/chat
 * Body: { prompt: string, history?: [{role: string, content: string}] }
 */
router.post(
  "/chat",
  requireAuth,
  body("prompt")
    .isString()
    .isLength({ min: 1, max: 1000 })
    .withMessage("Le prompt est obligatoire et doit contenir entre 1 et 1000 caractères."),
  handleValidationErrors,
  chat
);

export default router;
