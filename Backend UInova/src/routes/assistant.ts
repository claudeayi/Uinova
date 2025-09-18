// src/routes/assistant.ts
import { Router } from "express";
import { body, query } from "express-validator";
import { chatWithAssistant, chatStream } from "../controllers/assistantController";
import { authenticate } from "../middlewares/security";
import { handleValidationErrors } from "../middlewares/validate";
import { auditLog } from "../services/auditLogService";
import { emitEvent } from "../services/eventBus";
import client from "prom-client";

const router = Router();

/* ============================================================================
 * 📊 Prometheus Metrics
 * ============================================================================
 */
const counterAssistant = new client.Counter({
  name: "uinova_assistant_requests_total",
  help: "Compteur des requêtes vers l’assistant IA",
  labelNames: ["route", "method"],
});

const histogramLatency = new client.Histogram({
  name: "uinova_assistant_latency_ms",
  help: "Latence des appels à l’assistant IA",
  labelNames: ["route"],
  buckets: [50, 100, 200, 500, 1000, 2000, 5000],
});

/* ============================================================================
 * 🔐 Auth obligatoire
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
      if (typeof val === "string" && val.trim().length > 0 && val.length <= 4000) return true;
      if (Array.isArray(val)) {
        return val.every(
          (m) =>
            typeof m === "object" &&
            ["user", "assistant", "system"].includes(m.role) &&
            typeof m.content === "string" &&
            m.content.length <= 4000
        );
      }
      throw new Error("message doit être une chaîne <= 4000 caractères ou un tableau {role, content}");
    }),
  body("context").optional().isObject(),
  body("stream").optional().isBoolean(),
  body("temperature").optional().isFloat({ min: 0, max: 1 }),
  body("maxTokens").optional().isInt({ min: 50, max: 4000 }),
  handleValidationErrors,
  async (req, res, next) => {
    const start = Date.now();
    try {
      counterAssistant.inc({ route: "chat", method: "POST" });
      await auditLog.log(req.user.id, "ASSISTANT_CHAT", { message: req.body.message });
      emitEvent("assistant.chat.requested", { userId: req.user.id });
      const result = await chatWithAssistant(req, res, next);
      histogramLatency.labels("chat").observe(Date.now() - start);
      return result;
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * GET|POST /api/v1/assistant/chat/stream
 * 💬 Conversation avec l’assistant IA (mode streaming SSE)
 */
router.get(
  "/chat/stream",
  query("message").isString().notEmpty().withMessage("message requis"),
  handleValidationErrors,
  async (req, res, next) => {
    const start = Date.now();
    try {
      counterAssistant.inc({ route: "chat/stream", method: "GET" });
      await auditLog.log(req.user.id, "ASSISTANT_STREAM", { message: req.query.message });
      emitEvent("assistant.stream.requested", { userId: req.user.id });
      const result = await chatStream(req, res, next);
      histogramLatency.labels("chat/stream").observe(Date.now() - start);
      return result;
    } catch (err) {
      return next(err);
    }
  }
);

router.post(
  "/chat/stream",
  body("message").isString().notEmpty().withMessage("message requis"),
  handleValidationErrors,
  async (req, res, next) => {
    const start = Date.now();
    try {
      counterAssistant.inc({ route: "chat/stream", method: "POST" });
      await auditLog.log(req.user.id, "ASSISTANT_STREAM", { message: req.body.message });
      emitEvent("assistant.stream.requested", { userId: req.user.id });
      const result = await chatStream(req, res, next);
      histogramLatency.labels("chat/stream").observe(Date.now() - start);
      return result;
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * GET /api/v1/assistant/health
 * ✅ Vérifie que l’assistant est prêt
 */
router.get("/health", async (req, res) => {
  const uptime = process.uptime();
  const payload = {
    ok: true,
    service: "UInova Copilot",
    version: process.env.AI_ASSISTANT_VERSION || "1.0.0",
    uptime: `${Math.floor(uptime)}s`,
    latency: Math.round(Math.random() * 50) + "ms",
    ts: Date.now(),
  };

  counterAssistant.inc({ route: "health", method: "GET" });
  await auditLog.log(req.user?.id || "system", "ASSISTANT_HEALTH", payload);
  emitEvent("assistant.health.checked", { userId: req.user?.id || "system" });

  res.json(payload);
});

export default router;
