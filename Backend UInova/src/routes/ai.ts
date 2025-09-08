// src/routes/ai.ts
import { Router } from "express";
import { chat, chatStream, getModels } from "../controllers/aiController";
import { authenticate } from "../middlewares/security";
import { body, query } from "express-validator";
import { handleValidationErrors } from "../middlewares/validate";

const router = Router();

/* ============================================================================
 *  AI ROUTES – protégées par authentification
 * ========================================================================== */
router.use(authenticate);

/* ============================================================================
 *  CHAT (réponse unique IA)
 * ============================================================================
 * POST /api/ai/chat
 * Body:
 *   - prompt: string (obligatoire)
 *   - history?: [{ role: "system"|"user"|"assistant", content: string }]
 *   - system?: string
 *   - model?: string (ex: gpt-4o-mini)
 *   - temperature?: number (0–2)
 *   - maxTokens?: number (1–4096)
 *   - json?: boolean
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
  chat
);

/* ============================================================================
 *  CHAT STREAM (réponse IA en streaming SSE)
 * ============================================================================
 * GET /api/ai/chat/stream?prompt=...
 * POST /api/ai/chat/stream { prompt, history?, ... }
 *
 * Exemple usage (React / Next / Vue) :
 *   const es = new EventSource("/api/ai/chat/stream?prompt=Bonjour");
 *   es.addEventListener("start", e => console.log("Start:", e.data));
 *   es.addEventListener("message", e => console.log("Token:", e.data));
 *   es.addEventListener("end", e => console.log("End:", e.data));
 *   es.addEventListener("error", e => console.error("Erreur:", e.data));
 */
const streamValidators = [
  query("prompt")
    .optional()
    .isString()
    .isLength({ min: 1, max: 4000 })
    .withMessage("Le prompt doit contenir entre 1 et 4000 caractères."),
  query("temperature")
    .optional()
    .isFloat({ min: 0, max: 2 }),
  query("maxTokens")
    .optional()
    .isInt({ min: 1, max: 4096 }),
];

router.get("/chat/stream", streamValidators, handleValidationErrors, chatStream);

router.post(
  "/chat/stream",
  body("prompt")
    .isString()
    .isLength({ min: 1, max: 4000 })
    .withMessage("Le prompt est obligatoire et doit contenir entre 1 et 4000 caractères."),
  body("temperature").optional().isFloat({ min: 0, max: 2 }),
  body("maxTokens").optional().isInt({ min: 1, max: 4096 }),
  handleValidationErrors,
  chatStream
);

/* ============================================================================
 *  LISTE DES MODÈLES DISPONIBLES
 * ============================================================================
 * GET /api/ai/models
 * → Retourne la liste des modèles supportés
 */
router.get("/models", getModels);

export default router;
