// src/services/aiService.ts
import OpenAI from "openai";
import { logger } from "../utils/logger";
import { auditLog } from "./auditLogService";
import { emitEvent } from "./eventBus";
import { metrics } from "../utils/metrics";
import { z } from "zod";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "test-key",
  timeout: 30000, // ⏳ Timeout sécurité
});

/* ============================================================================
 * Types
 * ========================================================================== */
export interface GenerateOptions {
  prompt: string;
  history?: { role: "system" | "user" | "assistant"; content: string }[];
  system?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  userId?: string;
}

export interface StreamCallbacks {
  onToken: (t: string) => void;
  onStart?: (info: any) => void;
  onEnd?: (info: any) => void;
  onError?: (err: any) => void;
}

/* ============================================================================
 * Zod Schema
 * ========================================================================== */
const generateOptionsSchema = z.object({
  prompt: z.string().min(1),
  history: z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string(),
      })
    )
    .optional(),
  system: z.string().optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(1).optional(),
  maxTokens: z.number().positive().optional(),
  jsonMode: z.boolean().optional(),
  userId: z.string().optional(),
});

/* ============================================================================
 * Safe Wrapper
 * ========================================================================== */
async function safeCall<T>(
  action: string,
  fn: () => Promise<T>,
  userId?: string
): Promise<T | null> {
  const start = Date.now();
  try {
    const result = await fn();
    metrics.aiCalls.inc({ action, status: "success" });
    metrics.aiLatency.observe({ action }, Date.now() - start);
    return result;
  } catch (err: any) {
    logger.error(`❌ [AI] ${action} error`, err?.message);
    metrics.aiCalls.inc({ action, status: "error" });
    metrics.aiLatency.observe({ action }, Date.now() - start);
    await auditLog.log(userId || "system", "AI_ERROR", { action, error: err?.message });
    return null;
  }
}

/* ============================================================================
 * Réponse simple (non-streamée)
 * ========================================================================== */
export async function generateAssistantResponse(opts: GenerateOptions) {
  const parsed = generateOptionsSchema.parse(opts);
  const {
    prompt,
    history = [],
    system,
    model = process.env.OPENAI_DEFAULT_MODEL || "gpt-4o-mini",
    temperature = 0.3,
    maxTokens = 800,
    jsonMode = false,
    userId,
  } = parsed;

  return safeCall("generateAssistantResponse", async () => {
    const messages: any[] = [];
    if (system) messages.push({ role: "system", content: system });
    messages.push(...history);
    messages.push({ role: "user", content: prompt });

    const completion = await client.chat.completions.create({
      model,
      temperature,
      max_tokens: maxTokens,
      messages,
      response_format: jsonMode ? { type: "json_object" } : undefined,
      user: userId,
    });

    const answer = completion.choices[0].message?.content || "";
    const usage = completion.usage || {};

    // Metrics + Audit + Events
    metrics.aiTokens.inc({ model }, usage.total_tokens || 0);
    await auditLog.log(userId || "system", "AI_RESPONSE_GENERATED", {
      model,
      tokens: usage.total_tokens,
    });
    emitEvent("ai.response.generated", { userId, model, tokens: usage.total_tokens });

    return { answer, usage, model };
  }, userId);
}

/* ============================================================================
 * Réponse en streaming (SSE, WebSocket…)
 * ========================================================================== */
export async function generateAssistantStream(
  opts: GenerateOptions,
  cb: StreamCallbacks
) {
  const parsed = generateOptionsSchema.parse(opts);
  const {
    prompt,
    history = [],
    system,
    model = process.env.OPENAI_DEFAULT_MODEL || "gpt-4o-mini",
    temperature = 0.3,
    maxTokens = 800,
    jsonMode = false,
    userId,
  } = parsed;

  return safeCall("generateAssistantStream", async () => {
    const messages: any[] = [];
    if (system) messages.push({ role: "system", content: system });
    messages.push(...history);
    messages.push({ role: "user", content: prompt });

    const stream = await client.chat.completions.create({
      model,
      temperature,
      max_tokens: maxTokens,
      messages,
      response_format: jsonMode ? { type: "json_object" } : undefined,
      user: userId,
      stream: true,
    });

    cb.onStart?.({ model });

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content || "";
      if (token) cb.onToken(token);
    }

    cb.onEnd?.({ model });
    await auditLog.log(userId || "system", "AI_STREAM_COMPLETED", { model });
    emitEvent("ai.response.streamed", { userId, model });

    return { model };
  }, userId);
}

/* ============================================================================
 * Liste des modèles disponibles
 * ========================================================================== */
export async function listAvailableModels() {
  return safeCall("listAvailableModels", async () => {
    const res = await client.models.list();
    return res.data.map((m) => ({
      id: m.id,
      created: m.created,
      owned_by: m.owned_by,
    }));
  });
}
