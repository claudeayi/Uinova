// src/controllers/aiController.ts
import { Request, Response } from "express";
import { z } from "zod";
import {
  generateAssistantResponse,
  generateAssistantStream,
  listAvailableModels,
} from "../services/aiService";
import { moderatePrompt } from "../utils/aiModeration";
import crypto from "crypto";

// (Optionnel) quotas et audit – à remplacer par tes vrais utilitaires si dispo
const quota = {
  async ensureAndDebit(_userId: string, _kind: "ai", _cost = 1) {},
};
const audit = {
  async log(_data: any) {},
};

/* ============================================================================
 *  SCHEMAS VALIDATION
 * ========================================================================== */
const ChatSchema = z.object({
  prompt: z.string().min(1).max(4000),
  history: z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string().min(1).max(4000),
      })
    )
    .optional(),
  system: z.string().max(2000).optional(),
  model: z.string().optional(), // ex: "gpt-4o-mini"
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).max(4096).optional(),
  json: z.boolean().optional(), // JSON mode
});

function truncateHistory(
  history: { role: "system" | "user" | "assistant"; content: string }[] = [],
  maxChars = 8000
) {
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

/* ============================================================================
 *  CONTROLLERS
 * ========================================================================== */

/**
 * POST /api/ai/chat
 * → Génération classique (pas streaming)
 */
export const chat = async (req: Request, res: Response) => {
  try {
    const userId = (req as any)?.user?.id || "anonymous";
    const parsed = ChatSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Invalid body", details: parsed.error.flatten() });
    }

    const { prompt, history = [], system, model, temperature, maxTokens, json } =
      parsed.data;

    if (!moderatePrompt(prompt)) {
      return res
        .status(403)
        .json({ error: "Prompt interdit par la politique UInova." });
    }

    const safeHistory = truncateHistory(history);

    await quota.ensureAndDebit(userId, "ai", 1);

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

    // Audit log (prompt hash pour confidentialité)
    audit
      .log({
        type: "AI_CHAT",
        userId,
        promptHash: crypto.createHash("sha256").update(prompt).digest("hex"),
        model: result?.model,
        tokens: result?.usage?.totalTokens,
        ts: Date.now(),
      })
      .catch(() => {});

    return res.json({
      success: true,
      answer: result.answer,
      usage: result.usage,
      model: result.model,
    });
  } catch (e: any) {
    console.error("[AI] chat error:", e?.response?.data || e?.message || e);
    const msg =
      e?.response?.data?.error ||
      e?.message ||
      "Erreur lors de la génération AI.";
    return res.status(500).json({ success: false, error: msg });
  }
};

/**
 * SSE Streaming – GET ou POST /api/ai/chat/stream
 */
export const chatStream = async (req: Request, res: Response) => {
  const method = req.method.toUpperCase();
  const input = method === "POST" ? req.body : req.query;

  const parsed = ChatSchema.safeParse(input);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Invalid body", details: parsed.error.flatten() });
    return;
  }

  const userId = (req as any)?.user?.id || "anonymous";
  const { prompt, history = [], system, model, temperature, maxTokens, json } =
    parsed.data;

  if (!moderatePrompt(prompt)) {
    res
      .status(403)
      .json({ error: "Prompt interdit par la politique UInova." });
    return;
  }

  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });
  res.flushHeaders?.();

  const send = (event: string, data: any) => {
    res.write(`event: ${event}\n`);
    res.write(
      `data: ${typeof data === "string" ? data : JSON.stringify(data)}\n\n`
    );
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
        onError: (err: any) =>
          send("error", err?.message || "Erreur streaming AI"),
      }
    );

    res.end();
  } catch (e: any) {
    console.error("[AI] chatStream error:", e?.response?.data || e?.message);
    send("error", e?.message || "Erreur lors du streaming AI.");
    res.end();
  }
};

/**
 * GET /api/ai/models
 * → Retourne la liste des modèles disponibles pour le frontend
 */
export const getModels = async (_req: Request, res: Response) => {
  try {
    const models = await listAvailableModels();
    res.json({ success: true, data: models });
  } catch (e: any) {
    console.error("[AI] getModels error:", e?.message);
    res.status(500).json({ success: false, error: "Impossible de charger les modèles" });
  }
};
