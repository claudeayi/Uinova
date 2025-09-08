// src/routes/ai.ts
import { Router } from "express";
import { chat, chatStream, getModels } from "../controllers/aiController";
import { requireAuth } from "../middlewares/auth";
import { body, query } from "express-validator";
import { handleValidationErrors } from "../middlewares/validate";

const router = Router();

/* ============================================================================
 *  AI ROUTES – Interaction avec l’assistant IA
 *  Tous les endpoints nécessitent un JWT valide.
 * ========================================================================== */

/**
 * POST /api/ai/chat
 * Body: {
 *   prompt: string (1–4000),
 *   history?: [{role: "system"|"user"|"assistant", content: string}],
 *   system?: string,
 *   model?: string,
 *   temperature?: number (0–2),
 *   maxTokens?: number
 * }
 */
router.post(
  "/chat",
  requireAuth,
  body("prompt")
    .isString()
    .isLength({ min: 1, max: 4000 })
    .withMessage("Le prompt est obligatoire et doit contenir entre 1 et 4000 caractères."),
  body("history")
    .optional()
    .isArray({ min: 1 })
    .withMessage("history doit être un tableau valide."),
  body("history.*.role")
    .optional()
    .isIn(["system", "user", "assistant"])
    .withMessage("Rôle invalide dans history."),
  body("history.*.content")
    .optional()
    .isString()
    .withMessage("Le contenu de chaque message doit être une chaîne."),
  body("system").optional().isString().isLength({ max: 2000 }),
  body("model").optional().isString(),
  body("temperature").optional().isFloat({ min: 0, max: 2 }),
  body("maxTokens").optional().isInt({ min: 1, max: 4096 }),
  body("json").optional().isBoolean(),
  handleValidationErrors,
  chat
);

/**
 * GET|POST /api/ai/chat/stream
 * Body ou Query: même format que /chat
 * Retourne un flux SSE (text/event-stream) avec {event,message}.
 */
router.all(
  "/chat/stream",
  requireAuth,
  body("prompt")
    .optional()
    .isString()
    .isLength({ min: 1, max: 4000 }),
  query("prompt")
    .optional()
    .isString()
    .isLength({ min: 1, max: 4000 }),
  handleValidationErrors,
  chatStream
);

/**
 * GET /api/ai/models
 * Retourne la liste des modèles AI disponibles.
 */
router.get("/models", requireAuth, getModels);

export default router;
