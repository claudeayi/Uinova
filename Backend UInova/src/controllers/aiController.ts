import { Request, Response } from "express";
import { z } from "zod";
import crypto from "crypto";
import { v4 as uuid } from "uuid";
import client from "prom-client";
import {
  generateAssistantResponse,
  generateAssistantStream,
  listAvailableModels,
} from "../services/aiService";
import { moderatePrompt } from "../utils/aiModeration";
import { logger } from "../utils/logger";
import { billingService } from "../services/billingService";

/* ============================================================================
 * 📊 Prometheus Metrics
 * ========================================================================== */
const counterRequests = new client.Counter({
  name: "uinova_ai_requests_total",
  help: "Total des requêtes AI",
});
const counterErrors = new client.Counter({
  name: "uinova_ai_errors_total",
  help: "Erreurs AI",
});
const histogramLatency = new client.Histogram({
  name: "uinova_ai_request_duration_seconds",
  help: "Durée des requêtes AI",
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

/* ============================================================================
 * VALIDATION SCHEMA
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
    .max(50)
    .optional(),
  system: z.string().max(2000).optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).max(4096).optional(),
  json: z.boolean().optional(),
});

/* ============================================================================
 * Utils
 * ========================================================================== */
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
 * CONTROLLERS
 * ========================================================================== */

/**
 * POST /api/ai/chat
 * → Génération classique (réponse complète)
 */
export const chat = async (req: Request, res: Response) => {
  const start = Date.now();
  const requestId = uuid();
  counterRequests.inc();

  try {
    const userId = (req as any)?.user?.id || "anonymous";
    const parsed = ChatSchema.safeParse(req.body);
    if (!parsed.success) {
      counterErrors.inc();
      return res.status(400).json({
        success: false,
        error: "INVALID_BODY",
        details: parsed.error.flatten(),
        requestId,
      });
    }

    const { prompt, history = [], system, model, temperature, maxTokens, json } =
      parsed.data;

    // 🔒 Sécurité : modération
    if (!moderatePrompt(prompt)) {
      counterErrors.inc();
      return res.status(403).json({
        success: false,
        error: "Prompt interdit par la politique UInova.",
        requestId,
      });
    }

    // 💳 Quota réel
    const quotaCheck = await billingService.checkQuota(userId, "ai_tokens");
    if (!quotaCheck.ok) {
      return res.status(402).json({
        success: false,
        error: "QUOTA_EXCEEDED",
        limit: quotaCheck.limit,
        used: quotaCheck.used,
        requestId,
      });
    }

    const safeHistory = truncateHistory(history);

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

    await billingService.recordUsage(userId, "ai_tokens", result?.usage?.totalTokens || 0);

    histogramLatency.observe((Date.now() - start) / 1000);

    // 📜 Audit enrichi
    logger.info("📝 AI_CHAT_AUDIT", {
      requestId,
      userId,
      promptHash: crypto.createHash("sha256").update(prompt).digest("hex"),
      model: result?.model,
      tokens: result?.usage?.totalTokens,
      promptLength: prompt.length,
      latencyMs: Date.now() - start,
      ip: req.ip,
      ua: req.headers["user-agent"],
    });

    return res.json({
      success: true,
      requestId,
      answer: result.answer,
      usage: result.usage,
      model: result.model,
      mode: json ? "json" : "text",
    });
  } catch (e: any) {
    counterErrors.inc();
    logger.error("❌ [AI] chat error", e?.response?.data || e?.message || e);
    return res.status(500).json({
      success: false,
      error: e?.message || "Erreur lors de la génération AI.",
      requestId,
    });
  }
};

/**
 * GET|POST /api/ai/chat/stream
 * → Réponse en streaming SSE
 */
export const chatStream = async (req: Request, res: Response) => {
  const start = Date.now();
  const requestId = uuid();
  const method = req.method.toUpperCase();
  const input = method === "POST" ? req.body : req.query;

  const parsed = ChatSchema.safeParse(input);
  if (!parsed.success) {
    counterErrors.inc();
    return res
      .status(400)
      .json({ success: false, error: "INVALID_BODY", details: parsed.error.flatten(), requestId });
  }

  const userId = (req as any)?.user?.id || "anonymous";
  const { prompt, history = [], system, model, temperature, maxTokens, json } =
    parsed.data;

  if (!moderatePrompt(prompt)) {
    counterErrors.inc();
    return res.status(403).json({ success: false, error: "Prompt interdit.", requestId });
  }

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
    await billingService.checkQuota(userId, "ai_tokens");

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
        onStart: (info) => send("start", { requestId, ...info }),
        onEnd: (info) => {
          send("end", { requestId, ...info });
          logger.info("📝 AI_STREAM_AUDIT", {
            requestId,
            userId,
            promptHash: crypto.createHash("sha256").update(prompt).digest("hex"),
            model: info?.model,
            latencyMs: Date.now() - start,
            ip: req.ip,
            ua: req.headers["user-agent"],
          });
        },
        onError: (err: any) => send("error", err?.message || "Erreur streaming AI"),
      }
    );

    // Heartbeat pour éviter timeout côté client
    const heartbeat = setInterval(() => send("heartbeat", Date.now()), 15000);
    res.on("close", () => clearInterval(heartbeat));
  } catch (e: any) {
    counterErrors.inc();
    logger.error("❌ [AI] chatStream error", e?.response?.data || e?.message);
    send("error", e?.message || "Erreur lors du streaming AI.");
  } finally {
    res.end();
  }
};

/**
 * GET /api/ai/models
 * → Retourne la liste des modèles disponibles
 */
export const getModels = async (_req: Request, res: Response) => {
  try {
    const models = await listAvailableModels();
    res.json({ success: true, data: models });
  } catch (e: any) {
    logger.error("❌ [AI] getModels error", e?.message);
    res.status(500).json({ success: false, error: "Impossible de charger les modèles" });
  }
};
