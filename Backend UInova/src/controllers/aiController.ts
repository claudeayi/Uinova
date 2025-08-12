// src/controllers/aiController.ts
import { Request, Response } from "express";
import { z } from "zod";
import { generateAssistantResponse, generateAssistantStream } from "../services/aiService";
import { moderatePrompt } from "../utils/aiModeration";

// (Optionnel) petits hooks si tu as ces utilitaires, sinon laissent no-op
const quota = {
  async ensureAndDebit(_userId: string, _kind: "ai", _cost = 1) { /* no-op si pas de quotas */ },
};
const audit = {
  async log(_data: any) { /* no-op */ },
};

const ChatSchema = z.object({
  prompt: z.string().min(1).max(4000),
  history: z
    .array(z.object({ role: z.enum(["system", "user", "assistant"]), content: z.string().min(1).max(4000) }))
    .optional(),
  system: z.string().max(2000).optional(),
  model: z.string().optional(),                 // ex: "gpt-4o-mini"
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).max(4096).optional(),
  json: z.boolean().optional(),                 // JSON mode (contraint le modèle à répondre en JSON)
});

function truncateHistory(
  history: { role: "system" | "user" | "assistant"; content: string }[] = [],
  maxChars = 8000
) {
  // Conserve les derniers messages jusqu'à la limite de caractères
  let used = 0;
  const out: typeof history = [];
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    const len = msg.content.length + 20;
    if (used + len > maxChars) break;
    out.unshift(msg);
    used += len;
  }
  return out;
}

/**
 * POST /api/ai/chat
 * Body:
 *  {
 *    prompt: string,
 *    history?: [{role:"system"|"user"|"assistant", content:string}],
 *    system?: string,
 *    model?: string,
 *    temperature?: number,
 *    maxTokens?: number,
 *    json?: boolean
 *  }
 * Response:
 *  { answer: string, usage?: { promptTokens:number, completionTokens:number, totalTokens:number } }
 */
export const chat = async (req: Request, res: Response) => {
  try {
    const userId = (req as any)?.user?.sub || "anonymous";
    const parsed = ChatSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    }

    const { prompt, history = [], system, model, temperature, maxTokens, json } = parsed.data;

    // Modération
    if (!moderatePrompt(prompt)) {
      return res.status(403).json({ error: "Prompt interdit par la politique UInova." });
    }

    // Troncature de l’historique (évite les contextes trop gros)
    const safeHistory = truncateHistory(history);

    // (Optionnel) quotas
    await quota.ensureAndDebit(userId, "ai", 1);

    // Appel service IA
    const result = await generateAssistantResponse({
      prompt,
      history: safeHistory,
      system,
      model: model || process.env.OPENAI_DEFAULT_MODEL || "gpt-4o-mini",
      temperature: temperature ?? 0.3,
      maxTokens: maxTokens ?? 800,
      jsonMode: !!json,
      userId,
    });

    // Audit (non bloquant)
    audit.log({
      type: "AI_CHAT",
      userId,
      promptPreview: prompt.slice(0, 200),
      model: result?.model,
      tokens: result?.usage?.totalTokens,
      ts: Date.now(),
    }).catch(() => {});

    return res.json({
      answer: result.answer,
      usage: result.usage,   // si ton service retourne les tokens
      model: result.model,
    });
  } catch (e: any) {
    console.error("[AI] chat error:", e?.response?.data || e?.message || e);
    const msg = e?.response?.data?.error || e?.message || "Erreur lors de la génération AI.";
    return res.status(500).json({ error: msg });
  }
};

/**
 * GET /api/ai/chat/stream  (SSE)
 * Query/body identiques à /chat (tu peux passer en POST si tu préfères).
 * Front (Exemple):
 *  const es = new EventSource('/api/ai/chat/stream?...'); es.onmessage = (ev)=>append(ev.data);
 */
export const chatStream = async (req: Request, res: Response) => {
  // Autorise aussi POST si tu préfères envoyer un body JSON volumineux
  const method = req.method.toUpperCase();
  const input = method === "POST" ? req.body : req.query;

  const parsed = ChatSchema.safeParse(input);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    return;
  }

  const userId = (req as any)?.user?.sub || "anonymous";
  const { prompt, history = [], system, model, temperature, maxTokens, json } = parsed.data;

  // Modération
  if (!moderatePrompt(prompt)) {
    res.status(403).json({ error: "Prompt interdit par la politique UInova." });
    return;
  }

  // SSE headers
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });
  res.flushHeaders?.();

  const send = (event: string, data: any) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${typeof data === "string" ? data : JSON.stringify(data)}\n\n`);
  };

  try {
    const safeHistory = truncateHistory(history);
    await quota.ensureAndDebit(userId, "ai", 1);

    await generateAssistantStream(
      {
        prompt,
        history: safeHistory,
        system,
        model: model || process.env.OPENAI_DEFAULT_MODEL || "gpt-4o-mini",
        temperature: temperature ?? 0.3,
        maxTokens: maxTokens ?? 800,
        jsonMode: !!json,
        userId,
      },
      {
        onToken: (t: string) => send("message", t),
        onStart: (info) => send("start", info),
        onEnd: (info) => send("end", info),
        onError: (err: any) => send("error", err?.message || "stream error"),
      }
    );

    res.end();
  } catch (e: any) {
    console.error("[AI] chatStream error:", e?.response?.data || e?.message || e);
    send("error", e?.message || "Erreur lors du streaming AI.");
    res.end();
  }
};

/**
 * Exemple de routes à brancher:
 *
 * import { Router } from "express";
 * import { requireAuth } from "../middlewares/auth";
 * import { chat, chatStream } from "../controllers/aiController";
 *
 * const r = Router();
 * r.post("/chat", requireAuth, chat);
 * r.get("/chat/stream", requireAuth, chatStream); // ou r.post("/chat/stream", requireAuth, chatStream)
 * export default r;
 */
