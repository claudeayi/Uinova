// src/services/aiService.ts
import axios, { AxiosInstance } from "axios";
import { auditLog } from "./auditLogService";
import { emitEvent } from "./eventBus";
import client from "prom-client";

/* ============================================================================
 * 🧠 Providers & Config
 * ========================================================================== */
type Provider = "uinova" | "openai" | "ollama" | "vllm";

const AI_PROVIDER: Provider = (process.env.AI_PROVIDER as Provider) || "uinova";

const UINOVA_CORE_URL = process.env.UINOVA_CORE_URL || "https://api.legionweb.ai";
const UINOVA_CORE_KEY = process.env.UINOVA_CORE_KEY || "";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const VLLM_URL = process.env.VLLM_URL || ""; // ex: http://localhost:8000/v1
const VLLM_API_KEY = process.env.VLLM_API_KEY || "";

/* ============================================================================
 * 🔧 Types
 * ========================================================================== */
export type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool" | "function";
  content: string;
};

export type GenOptions = {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  timeoutMs?: number;
  maxHistory?: number;
  userId?: string; // pour audit
};

const DEFAULTS = {
  model:
    AI_PROVIDER === "uinova"
      ? process.env.UINOVA_MODEL || "uinova-core-v2"
      : OPENAI_MODEL,
  temperature: Number(process.env.OPENAI_TEMPERATURE || 0.7),
  maxTokens: Number(process.env.OPENAI_MAX_TOKENS || 400),
  timeoutMs: Number(process.env.OPENAI_TIMEOUT_MS || 20_000),
  maxHistory: 20,
};

/* ============================================================================
 * 📊 Prometheus metrics
 * ========================================================================== */
const counterAIRequests = new client.Counter({
  name: "uinova_ai_requests_total",
  help: "Nombre de requêtes IA",
  labelNames: ["provider", "model", "status"],
});

const histogramAILatency = new client.Histogram({
  name: "uinova_ai_latency_ms",
  help: "Latence des appels IA (ms)",
  labelNames: ["provider", "model", "status"],
  buckets: [50, 100, 200, 500, 1000, 2000, 5000, 10000],
});

/* ============================================================================
 * 🛠️ Utils
 * ========================================================================== */
function sanitizeHistory(history: any[], max = DEFAULTS.maxHistory): ChatMessage[] {
  if (!Array.isArray(history)) return [];
  return history
    .slice(-max)
    .map((m) => {
      const role = (m?.role || "").toString();
      const content = m?.content ?? "";
      if (!["system", "user", "assistant", "tool", "function"].includes(role)) return null;
      if (typeof content !== "string") {
        try {
          return { role: role as any, content: JSON.stringify(content) } as ChatMessage;
        } catch {
          return { role: role as any, content: String(content) } as ChatMessage;
        }
      }
      return { role: role as any, content };
    })
    .filter(Boolean) as ChatMessage[];
}

function buildMessages(prompt: string, history: any[], systemPrompt?: string, maxHistory?: number): ChatMessage[] {
  const msgs: ChatMessage[] = [];
  if (systemPrompt) msgs.push({ role: "system", content: systemPrompt });
  msgs.push(...sanitizeHistory(history, maxHistory ?? DEFAULTS.maxHistory));
  msgs.push({ role: "user", content: prompt });
  return msgs;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Retry avec backoff expo + jitter pour 429/5xx */
async function withRetry<T>(fn: () => Promise<T>, attempts = 3) {
  let lastErr: any;
  for (let i = 0; i < attempts; i++) {
    const tryCount = i + 1;
    try {
      return await fn();
    } catch (e: any) {
      lastErr = e;
      const status = e?.status || e?.response?.status;
      const retriable = status === 429 || (status >= 500 && status < 600) || !status;
      if (!retriable || tryCount >= attempts) break;
      const delay = Math.min(2000 * Math.pow(2, i), 8000) + Math.random() * 250;
      await sleep(delay);
    }
  }
  throw lastErr;
}

/* ============================================================================
 * 🌐 HTTP clients
 * ========================================================================== */
function makeHttp(timeoutMs: number): AxiosInstance {
  return axios.create({
    timeout: timeoutMs,
  });
}

/* ============================================================================
 * 🧠 Provider: UInova Core AI (OpenAI-compatible API)
 * ========================================================================== */
async function callUInovaCoreChat({
  model,
  messages,
  temperature,
  max_tokens,
  timeoutMs,
}: {
  model: string;
  messages: ChatMessage[];
  temperature: number;
  max_tokens: number;
  timeoutMs: number;
}): Promise<string> {
  if (!UINOVA_CORE_KEY) {
    throw new Error("Missing UINOVA_CORE_KEY");
  }
  const http = makeHttp(timeoutMs);
  const url = `${UINOVA_CORE_URL.replace(/\/+$/, "")}/uinova-core/v1/chat/completions`;

  const { data } = await http.post(
    url,
    { model, messages, temperature, max_tokens },
    { headers: { Authorization: `Bearer ${UINOVA_CORE_KEY}` } }
  );

  return data?.choices?.[0]?.message?.content?.trim?.() || "";
}

/* ============================================================================
 * 🧠 Provider: OpenAI (optionnel)
 * ========================================================================== */
async function callOpenAIChat({
  model,
  messages,
  temperature,
  max_tokens,
  timeoutMs,
}: {
  model: string;
  messages: ChatMessage[];
  temperature: number;
  max_tokens: number;
  timeoutMs: number;
}): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  // Import dynamique pour éviter d’ajouter OpenAI si non utilisé
  const { OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: OPENAI_API_KEY });

  const res = await client.chat.completions.create(
    { model, messages, temperature, max_tokens },
    { timeout: timeoutMs }
  );
  return res.choices?.[0]?.message?.content?.trim?.() || "";
}

/* ============================================================================
 * 🧠 Provider: Ollama (optionnel)
 * ========================================================================== */
async function callOllamaChat({
  model,
  messages,
  temperature,
  max_tokens,
  timeoutMs,
}: {
  model: string;
  messages: ChatMessage[];
  temperature: number;
  max_tokens: number;
  timeoutMs: number;
}): Promise<string> {
  const http = makeHttp(timeoutMs);
  // API ollama chat: POST /api/chat
  // https://github.com/ollama/ollama/blob/main/docs/api.md#generate-a-chat-completion
  const url = `${OLLAMA_URL.replace(/\/+$/, "")}/api/chat`;
  const { data } = await http.post(url, {
    model,
    messages,
    options: { temperature, num_predict: max_tokens },
    stream: false,
  });
  // Concatenate messages content (Ollama returns whole object)
  const content = data?.message?.content ?? data?.messages?.map((m: any) => m.content).join("\n");
  return (content || "").toString().trim();
}

/* ============================================================================
 * 🧠 Provider: vLLM (optionnel – OpenAI-compatible)
 * ========================================================================== */
async function callVLLMChat({
  model,
  messages,
  temperature,
  max_tokens,
  timeoutMs,
}: {
  model: string;
  messages: ChatMessage[];
  temperature: number;
  max_tokens: number;
  timeoutMs: number;
}): Promise<string> {
  if (!VLLM_URL) throw new Error("Missing VLLM_URL");
  const http = makeHttp(timeoutMs);
  const url = `${VLLM_URL.replace(/\/+$/, "")}/chat/completions`;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (VLLM_API_KEY) headers["Authorization"] = `Bearer ${VLLM_API_KEY}`;

  const { data } = await http.post(
    url,
    { model, messages, temperature, max_tokens },
    { headers }
  );

  return data?.choices?.[0]?.message?.content?.trim?.() || "";
}

/* ============================================================================
 * 🎯 Front API – one-shot completion
 * ========================================================================== */
export async function generateAssistantResponse(
  prompt: string,
  history: any[] = [],
  opts: GenOptions = {}
): Promise<string> {
  const start = Date.now();
  const model = opts.model || DEFAULTS.model;
  const temperature = opts.temperature ?? DEFAULTS.temperature;
  const max_tokens = opts.maxTokens ?? DEFAULTS.maxTokens;
  const timeoutMs = opts.timeoutMs ?? DEFAULTS.timeoutMs;

  const messages = buildMessages(
    prompt,
    history,
    opts.systemPrompt ||
      "Tu es UInova Core AI. Réponds avec clarté, concision et précision. Priorise l'actionnable et le code de qualité production.",
    opts.maxHistory
  );

  const labels = { provider: AI_PROVIDER, model, status: "success" as "success" | "error" };

  try {
    const text = await withRetry(() => {
      switch (AI_PROVIDER) {
        case "uinova":
          if (!UINOVA_CORE_KEY) throw new Error("UINOVA_CORE_KEY manquant");
          return callUInovaCoreChat({ model, messages, temperature, max_tokens, timeoutMs });
        case "openai":
          return callOpenAIChat({ model, messages, temperature, max_tokens, timeoutMs });
        case "ollama":
          return callOllamaChat({ model, messages, temperature, max_tokens, timeoutMs });
        case "vllm":
          return callVLLMChat({ model, messages, temperature, max_tokens, timeoutMs });
        default:
          throw new Error(`Provider inconnu: ${AI_PROVIDER}`);
      }
    }, 3);

    labels.status = "success";
    counterAIRequests.inc(labels);
    histogramAILatency.labels(labels.provider, labels.model, labels.status).observe(Date.now() - start);

    // audit & events (best-effort)
    if (opts.userId) {
      await auditLog.log(opts.userId, "AI_COMPLETION", {
        provider: AI_PROVIDER,
        model,
        promptLen: prompt?.length || 0,
        historyLen: history?.length || 0,
      });
    }
    emitEvent("ai.completion", { provider: AI_PROVIDER, model });

    return text || "Aucune réponse IA";
  } catch (err: any) {
    labels.status = "error";
    counterAIRequests.inc(labels);
    histogramAILatency.labels(labels.provider, labels.model, labels.status).observe(Date.now() - start);

    if (opts.userId) {
      await auditLog.log(opts.userId, "AI_COMPLETION_FAILED", {
        provider: AI_PROVIDER,
        model,
        error: err?.message || String(err),
      });
    }
    emitEvent("ai.completion.failed", { provider: AI_PROVIDER, model, error: err?.message });

    throw err;
  }
}

/* ============================================================================
 * 🎯 Front API – JSON strict
 * ========================================================================== */
export async function generateJSON<T = any>(
  prompt: string,
  history: any[] = [],
  opts: GenOptions & { schemaHint?: string } = {}
): Promise<{ ok: true; data: T } | { ok: false; raw: string; error?: string }> {
  const system =
    (opts.systemPrompt ? opts.systemPrompt + "\n" : "") +
    (opts.schemaHint
      ? `Réponds STRICTEMENT en JSON valide correspondant à ce schéma conceptuel: ${opts.schemaHint}. N'utilise pas de code fences.`
      : "Réponds STRICTEMENT en JSON valide, sans code fences.");

  try {
    const text = await generateAssistantResponse(prompt, history, {
      ...opts,
      systemPrompt: system,
      temperature: Math.min(0.2, opts.temperature ?? 0.2),
      maxTokens: opts.maxTokens ?? DEFAULTS.maxTokens,
    });

    try {
      const parsed = JSON.parse(text);
      return { ok: true, data: parsed as T };
    } catch {
      return { ok: false, raw: text, error: "INVALID_JSON" };
    }
  } catch (e: any) {
    return { ok: false, raw: "", error: e?.message || "AI_ERROR" };
  }
}

/* ============================================================================
 * 🎯 Front API – Streaming (AsyncGenerator<string>)
 *  - UInova & vLLM: API OpenAI-compatible (SSE "data: {...}")
 *  - OpenAI: SDK streaming
 *  - Ollama: stream JSON-lines → concatène les chunks "message->content"
 * ========================================================================== */
export async function* generateAssistantStream(
  prompt: string,
  history: any[] = [],
  opts: GenOptions = {}
): AsyncGenerator<string> {
  const model = opts.model || DEFAULTS.model;
  const temperature = opts.temperature ?? DEFAULTS.temperature;
  const max_tokens = opts.maxTokens ?? DEFAULTS.maxTokens;
  const timeoutMs = opts.timeoutMs ?? DEFAULTS.timeoutMs;

  const messages = buildMessages(prompt, history, opts.systemPrompt, opts.maxHistory);

  // Provider-specific streaming
  if (AI_PROVIDER === "openai") {
    const { OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    // @ts-ignore – SDK streaming
    const stream = await openai.chat.completions.create(
      { model, messages, temperature, max_tokens, stream: true },
      { timeout: timeoutMs }
    );
    // @ts-ignore – iterate deltas
    for await (const part of stream) {
      const delta = part?.choices?.[0]?.delta?.content;
      if (delta) yield delta;
    }
    return;
  }

  if (AI_PROVIDER === "ollama") {
    // Ollama streaming: POST /api/chat { stream: true }
    const url = `${OLLAMA_URL.replace(/\/+$/, "")}/api/chat`;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      method: "POST",
      body: JSON.stringify({
        model,
        messages,
        options: { temperature, num_predict: max_tokens },
        stream: true,
      }),
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
    });
    clearTimeout(id);

    if (!res.ok || !res.body) return;

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line) continue;
        try {
          const obj = JSON.parse(line);
          const chunk = obj?.message?.content || "";
          if (chunk) yield chunk;
        } catch {
          // ignore malformed lines
        }
      }
    }
    return;
  }

  // UInova Core AI & vLLM: OpenAI-compatible SSE
  const base =
    AI_PROVIDER === "uinova"
      ? `${UINOVA_CORE_URL.replace(/\/+$/, "")}/uinova-core/v1`
      : `${VLLM_URL.replace(/\/+$/, "")}`;

  const url = `${base}/chat/completions`;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (AI_PROVIDER === "uinova") headers.Authorization = `Bearer ${UINOVA_CORE_KEY}`;
  if (AI_PROVIDER === "vllm" && VLLM_API_KEY) headers.Authorization = `Bearer ${VLLM_API_KEY}`;

  const res = await fetch(url, {
    method: "POST",
    body: JSON.stringify({ model, messages, temperature, max_tokens, stream: true }),
    headers,
    signal: controller.signal,
  });
  clearTimeout(id);

  if (!res.ok || !res.body) return;

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buf = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    // Parse SSE by lines
    const parts = buf.split("\n");
    buf = parts.pop() || "";
    for (const line of parts) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data:")) continue;
      const json = trimmed.replace(/^data:\s*/, "");
      if (json === "[DONE]") return;
      try {
        const obj = JSON.parse(json);
        const delta = obj?.choices?.[0]?.delta?.content;
        if (delta) yield delta as string;
      } catch {
        // ignore
      }
    }
  }
}

/* ============================================================================
 * 🔎 Exports
 * ========================================================================== */
export const AI_DEFAULTS = {
  model: DEFAULTS.model,
  temperature: DEFAULTS.temperature,
  maxTokens: DEFAULTS.maxTokens,
  timeoutMs: DEFAULTS.timeoutMs,
};

export function getAIProvider(): Provider {
  return AI_PROVIDER;
}
