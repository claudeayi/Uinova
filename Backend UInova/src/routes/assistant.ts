// src/routes/assistant.ts
import { Router } from "express";
import { body, query } from "express-validator";
import { chatWithAssistant, chatStream } from "../controllers/assistantController";
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
 * 💬 Conversation avec l’assistant IA (mode classique)
 */
router.post(
  "/chat",
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
      throw new Error("message doit être une chaîne ou un tableau {role, content}");
    }),
  body("context").optional().isObject(),
  body("stream").optional().isBoolean(),
  body("temperature").optional().isFloat({ min: 0, max: 1 }),
  body("maxTokens").optional().isInt({ min: 50, max: 4000 }),
  handleValidationErrors,
  chatWithAssistant
);

/**
 * GET|POST /api/v1/assistant/chat/stream
 * 💬 Conversation avec l’assistant IA (mode streaming SSE)
 * Exemple front:
 *   const es = new EventSource("/api/v1/assistant/chat/stream?prompt=Hello");
 *   es.onmessage = (ev) => console.log(ev.data);
 */
router.get(
  "/chat/stream",
  query("message").isString().notEmpty().withMessage("message requis"),
  handleValidationErrors,
  chatStream
);
router.post(
  "/chat/stream",
  body("message").isString().notEmpty().withMessage("message requis"),
  handleValidationErrors,
  chatStream
);

/**
 * GET /api/v1/assistant/health
 * ✅ Vérifie que l’assistant est prêt
 */
router.get("/health", (_req, res) => {
  const uptime = process.uptime();
  res.json({
    ok: true,
    service: "UInova Copilot",
    version: process.env.AI_ASSISTANT_VERSION || "1.0.0",
    uptime: `${Math.floor(uptime)}s`,
    latency: Math.round(Math.random() * 50) + "ms", // mock latence
    ts: Date.now(),
  });
});

export default router;
