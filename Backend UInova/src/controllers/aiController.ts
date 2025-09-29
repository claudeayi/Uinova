// src/controllers/AiController.ts
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
  help: "Nombre total de requêtes AI",
  labelNames: ["action", "status", "userType"],
});
const histogramLatency = new client.Histogram({
  name: "uinova_ai_request_duration_seconds",
  help: "Durée des requêtes AI",
  labelNames: ["action", "status"],
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

function auditAiLog(event: string, data: any) {
  logger.info(`📝 ${event}`, data);
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
  const userId = (req as any)?.user?.id || "anonymous";
  const userType = (req as any)?.user?.role || "GUEST";

  try {
    const parsed = ChatSchema.safeParse(req.body);
    if (!parsed.success) {
      counterRequests.inc({ action: "chat", status: "error", userType });
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
      counterRequests.inc({ action: "chat", status: "blocked", userType });
      return res.status(403).json({
        success: false,
        error: "PROMPT_BLOCKED",
        requestId,
      });
    }

    // 💳 Quota
    const quotaCheck = await billingService.checkQuota(userId, "ai_tokens");
    if (!quotaCheck.ok) {
      counterRequests.inc({ action: "chat", status: "quota_exceeded", userType });
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

    counterRequests.inc({ action: "chat", status: "success", userType });
    histogramLatency.labels("chat", "success").observe((Date.now() - start) / 1000);

    auditAiLog("AI_CHAT_AUDIT", {
      requestId,
      userId,
      userType,
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
    counterRequests.inc({ action: "chat", status: "error", userType });
    logger.error("❌ [AI] chat error", e?.response?.data || e?.message || e);
    return res.status(500).json({
      success: false,
      error: "INTERNAL_ERROR",
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
  const userId = (req as any)?.user?.id || "anonymous";
  const userType = (req as any)?.user?.role || "GUEST";

  const method = req.method.toUpperCase();
  const input = method === "POST" ? req.body : req.query;
  const parsed = ChatSchema.safeParse(input);

  if (!parsed.success) {
    counterRequests.inc({ action: "chatStream", status: "error", userType });
    return res.status(400).json({
      success: false,
      error: "INVALID_BODY",
      details: parsed.error.flatten(),
      requestId,
    });
  }

  const { prompt, history = [], system, model, temperature, maxTokens, json } =
    parsed.data;

  if (!moderatePrompt(prompt)) {
    counterRequests.inc({ action: "chatStream", status: "blocked", userType });
    return res.status(403).json({ success: false, error: "PROMPT_BLOCKED", requestId });
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
          auditAiLog("AI_STREAM_AUDIT", {
            requestId,
            userId,
            userType,
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

    counterRequests.inc({ action: "chatStream", status: "success", userType });
    histogramLatency.labels("chatStream", "success").observe((Date.now() - start) / 1000);

    // Heartbeat
    const heartbeat = setInterval(() => send("heartbeat", Date.now()), 15000);
    res.on("close", () => clearInterval(heartbeat));
  } catch (e: any) {
    counterRequests.inc({ action: "chatStream", status: "error", userType });
    logger.error("❌ [AI] chatStream error", e?.response?.data || e?.message);
    send("error", "INTERNAL_ERROR");
  } finally {
    res.end();
  }
};

/**
 * GET /api/ai/models
 * → Liste enrichie des modèles disponibles
 */
export const getModels = async (_req: Request, res: Response) => {
  try {
    const models = await listAvailableModels();
    counterRequests.inc({ action: "getModels", status: "success", userType: "ANY" });
    return res.json({
      success: true,
      data: models.sort((a: any, b: any) => a.provider.localeCompare(b.provider)),
    });
  } catch (e: any) {
    counterRequests.inc({ action: "getModels", status: "error", userType: "ANY" });
    logger.error("❌ [AI] getModels error", e?.message);
    return res.status(500).json({ success: false, error: "INTERNAL_ERROR" });
  }
};
