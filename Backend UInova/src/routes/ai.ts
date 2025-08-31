// src/routes/ai.ts
import { Router } from "express";
import { chat, chatStream } from "../controllers/aiController";
import { authenticate } from "../middlewares/security";

const router = Router();

/* ============================================================================
 *  AI ROUTES – protégées par authentification
 * ========================================================================== */
router.use(authenticate);

// ✅ POST /api/ai/chat → réponse unique IA
// Body: { prompt, history?, system?, model?, temperature?, maxTokens?, json? }
router.post("/chat", chat);

// ✅ SSE stream – réponse IA token par token
// Frontend usage (React/Next/Vue):
//   const es = new EventSource("/api/ai/chat/stream?prompt=...");
//   es.onmessage = (ev) => console.log(ev.data);
// Support GET (query) et POST (body JSON) pour plus de flexibilité
router.get("/chat/stream", chatStream);
router.post("/chat/stream", chatStream);

export default router;
