// src/services/aiService.ts
import OpenAI from "openai";
import { logger } from "../utils/logger";

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
 * Réponse simple (non-streamée)
 * ========================================================================== */
export async function generateAssistantResponse(opts: GenerateOptions) {
  const {
    prompt,
    history = [],
    system,
    model = process.env.OPENAI_DEFAULT_MODEL || "gpt-4o-mini",
    temperature = 0.3,
    maxTokens = 800,
    jsonMode = false,
    userId,
  } = opts;

  try {
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

    return { answer, usage, model };
  } catch (err: any) {
    logger.error("❌ [AI] generateAssistantResponse error", err?.message);
    throw err;
  }
}

/* ============================================================================
 * Réponse en streaming (SSE, WebSocket…)
 * ========================================================================== */
export async function generateAssistantStream(
  opts: GenerateOptions,
  cb: StreamCallbacks
) {
  const {
    prompt,
    history = [],
    system,
    model = process.env.OPENAI_DEFAULT_MODEL || "gpt-4o-mini",
    temperature = 0.3,
    maxTokens = 800,
    jsonMode = false,
    userId,
  } = opts;

  try {
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
  } catch (err: any) {
    logger.error("❌ [AI] generateAssistantStream error", err?.message);
    cb.onError?.(err);
  }
}

/* ============================================================================
 * Liste des modèles disponibles
 * ========================================================================== */
export async function listAvailableModels() {
  try {
    const res = await client.models.list();
    return res.data.map((m) => ({
      id: m.id,
      created: m.created,
      owned_by: m.owned_by,
    }));
  } catch (err: any) {
    logger.error("❌ [AI] listAvailableModels error", err?.message);
    return [];
  }
}
