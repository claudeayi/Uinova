// src/routes/ai.ts
import { Router } from "express";
import { chat, chatStream, getModels } from "../controllers/aiController";
import { authenticate } from "../middlewares/security";
import { body, query } from "express-validator";
import { handleValidationErrors } from "../middlewares/validate";
import { auditLog } from "../services/auditLogService";
import { emitEvent } from "../services/eventBus";
import client from "prom-client";

const router = Router();

/* ============================================================================
 * 📊 Prometheus Metrics
 * ============================================================================
 */
const counterAiRequests = new client.Counter({
  name: "uinova_ai_requests_total",
  help: "Nombre total de requêtes IA",
  labelNames: ["route", "method"],
});

/* ============================================================================
 * 🔐 Toutes les routes protégées par authentification
 * ============================================================================
 */
router.use(authenticate);

/* ============================================================================
 *  CHAT (réponse unique IA)
 * ============================================================================
 * POST /api/ai/chat
 */
router.post(
  "/chat",
  body("prompt")
    .isString()
    .isLength({ min: 1, max: 4000 })
    .withMessage("Le prompt est obligatoire et doit contenir entre 1 et 4000 caractères."),
  body("temperature")
    .optional()
    .isFloat({ min: 0, max: 2 })
    .withMessage("temperature doit être un nombre entre 0 et 2."),
  body("maxTokens")
    .optional()
    .isInt({ min: 1, max: 4096 })
    .withMessage("maxTokens doit être compris entre 1 et 4096."),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      counterAiRequests.inc({ route: "chat", method: "POST" });
      await auditLog.log(req.user.id, "AI_CHAT", { prompt: req.body.prompt });
      emitEvent("ai.chat.requested", { userId: req.user.id });
      return chat(req, res, next);
    } catch (err) {
      return next(err);
    }
  }
);

/* ============================================================================
 *  CHAT STREAM (réponse IA en streaming SSE)
 * ============================================================================
 * GET /api/ai/chat/stream?prompt=...
 * POST /api/ai/chat/stream { prompt, history?, ... }
 */
const streamValidators = [
  query("prompt")
    .optional()
    .isString()
    .isLength({ min: 1, max: 4000 })
    .withMessage("Le prompt doit contenir entre 1 et 4000 caractères."),
  query("temperature").optional().isFloat({ min: 0, max: 2 }),
  query("maxTokens").optional().isInt({ min: 1, max: 4096 }),
];

router.get(
  "/chat/stream",
  streamValidators,
  handleValidationErrors,
  async (req, res, next) => {
    try {
      counterAiRequests.inc({ route: "chat/stream", method: "GET" });
      await auditLog.log(req.user.id, "AI_STREAM", { prompt: req.query.prompt });
      emitEvent("ai.stream.requested", { userId: req.user.id });
      return chatStream(req, res, next);
    } catch (err) {
      return next(err);
    }
  }
);

router.post(
  "/chat/stream",
  body("prompt")
    .isString()
    .isLength({ min: 1, max: 4000 })
    .withMessage("Le prompt est obligatoire et doit contenir entre 1 et 4000 caractères."),
  body("temperature").optional().isFloat({ min: 0, max: 2 }),
  body("maxTokens").optional().isInt({ min: 1, max: 4096 }),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      counterAiRequests.inc({ route: "chat/stream", method: "POST" });
      await auditLog.log(req.user.id, "AI_STREAM", { prompt: req.body.prompt });
      emitEvent("ai.stream.requested", { userId: req.user.id });
      return chatStream(req, res, next);
    } catch (err) {
      return next(err);
    }
  }
);

/* ============================================================================
 *  LISTE DES MODÈLES DISPONIBLES
 * ============================================================================
 * GET /api/ai/models
 */
router.get("/models", async (req, res, next) => {
  try {
    counterAiRequests.inc({ route: "models", method: "GET" });
    await auditLog.log(req.user.id, "AI_MODELS_LIST", {});
    emitEvent("ai.models.requested", { userId: req.user.id });
    return getModels(req, res, next);
  } catch (err) {
    return next(err);
  }
});

export default router;
