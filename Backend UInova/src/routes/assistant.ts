import { Router } from "express";
import { body } from "express-validator";
import { chatWithAssistant } from "../controllers/assistantController";
import { authenticate } from "../middlewares/security";
import { handleValidationErrors } from "../middlewares/validate";

const router = Router();

/* ============================================================================
 *  ASSISTANT IA – Copilot intelligent (auth + multi-tenant)
 * ============================================================================
 */
router.use(authenticate);

/**
 * POST /api/v1/assistant/chat
 * 💬 Conversation avec l’assistant IA (Copilot UInova)
 * Body:
 * {
 *   message: "string" | { role: "user"|"system"|"assistant", content: string }[],
 *   context?: object,         // Contexte projet/utilisateur
 *   stream?: boolean,         // Active SSE (Server-Sent Events)
 *   temperature?: number,     // 0.0 - 1.0 (créativité)
 *   maxTokens?: number,       // limite de tokens
 * }
 */
router.post(
  "/chat",
  // message: soit string simple, soit tableau de messages {role, content}
  body("message")
    .custom((val) => {
      if (typeof val === "string" && val.trim().length > 0) return true;
      if (Array.isArray(val)) {
        return val.every(
          (m) =>
            typeof m === "object" &&
            ["user", "assistant", "system"].includes(m.role) &&
            typeof m.content === "string"
        );
      }
      throw new Error("message doit être une chaîne ou un tableau de messages {role, content}");
    }),
  body("context")
    .optional()
    .isObject()
    .withMessage("context doit être un objet"),
  body("stream")
    .optional()
    .isBoolean()
    .withMessage("stream doit être un booléen"),
  body("temperature")
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage("temperature doit être entre 0.0 et 1.0"),
  body("maxTokens")
    .optional()
    .isInt({ min: 50, max: 4000 })
    .withMessage("maxTokens doit être entre 50 et 4000"),
  handleValidationErrors,
  chatWithAssistant
);

/**
 * GET /api/v1/assistant/health
 * ✅ Vérifie que l’assistant est prêt
 */
router.get("/health", (_req, res) => {
  res.json({
    ok: true,
    name: "UInova Copilot",
    version: process.env.AI_ASSISTANT_VERSION || "1.0.0",
    ts: Date.now(),
  });
});

export default router;
