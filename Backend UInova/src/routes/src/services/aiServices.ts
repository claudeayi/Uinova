// src/services/aiService.ts
import { OpenAI } from "openai";

/**
 * Config via .env
 * - OPENAI_API_KEY=...
 * - OPENAI_MODEL=gpt-4o (par défaut)
 * - OPENAI_TEMPERATURE=0.7
 * - OPENAI_MAX_TOKENS=400
 * - OPENAI_TIMEOUT_MS=20000
 */
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error("Missing OPENAI_API_KEY in environment.");
}

const client = new OpenAI({
  apiKey,
  // timeout au niveau transport (optionnel selon SDK)
  // baseURL: process.env.OPENAI_BASE_URL, // si proxy/self-host
});

type ChatMessage = { role: "system" | "user" | "assistant" | "tool" | "function"; content: any };

type GenOptions = {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  // sécurité/perf
  timeoutMs?: number;
  // soft-limits histoire de ne pas dépasser
  maxHistory?: number;          // nb max de messages gardés
};

const DEFAULTS = {
  model: process.env.OPENAI_MODEL || "gpt-4o",
  temperature: Number(process.env.OPENAI_TEMPERATURE || 0.7),
  maxTokens: Number(process.env.OPENAI_MAX_TOKENS || 400),
  timeoutMs: Number(process.env.OPENAI_TIMEOUT_MS || 20_000),
  maxHistory: 20,
};

function sanitizeHistory(history: any[]): ChatMessage[] {
  if (!Array.isArray(history)) return [];
  return history
    .slice(-DEFAULTS.maxHistory)
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

function buildMessages(prompt: string, history: any[], systemPrompt?: string): ChatMessage[] {
  const msgs: ChatMessage[] = [];
  if (systemPrompt) {
    msgs.push({
      role: "system",
      content: systemPrompt,
    });
  }
  msgs.push(...sanitizeHistory(history));
  msgs.push({ role: "user", content: prompt });
  return msgs;
}

/** Retry avec backoff pour 429/5xx */
async function withRetry<T>(fn: () => Promise<T>, attempts = 3) {
  let lastErr: any;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e: any) {
      lastErr = e;
      const status = e?.status || e?.response?.status;
      const retriable = status === 429 || (status >= 500 && status < 600);
      if (!retriable || i === attempts - 1) break;
      // backoff expo + jitter
      const delay = Math.min(2000 * Math.pow(2, i), 8000) + Math.random() * 250;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

/**
 * Génère une réponse assistant “one-shot”.
 * Signature compatible avec ton contrôleur: generateAssistantResponse(prompt, history)
 */
export async function generateAssistantResponse(
  prompt: string,
  history: any[] = [],
  opts: GenOptions = {}
): Promise<string> {
  const model = opts.model || DEFAULTS.model;
  const temperature = opts.temperature ?? DEFAULTS.temperature;
  const max_tokens = opts.maxTokens ?? DEFAULTS.maxTokens;
  const timeoutMs = opts.timeoutMs ?? DEFAULTS.timeoutMs;

  const messages = buildMessages(
    prompt,
    history,
    opts.systemPrompt ||
      "Tu es UInova Assistant. Réponds de façon claire, utile et concise. Évite les fioritures inutiles."
  );

  const res = await withRetry(
    () =>
      client.chat.completions.create(
        {
          model,
          messages,
          temperature,
          max_tokens,
        },
        { timeout: timeoutMs }
      ),
    3
  );

  // Retourne le texte ou un fallback
  return res.choices?.[0]?.message?.content?.trim?.() || "Aucune réponse IA";
}

/**
 * Variante JSON 👇 (optionnelle mais pratique côté front quand on attend un objet).
 * - Utilise le format JSON “safe” (pas de backticks).
 * - Si la sortie n’est pas un JSON valide, renvoie { ok:false, raw }.
 */
export async function generateJSON<T = any>(
  prompt: string,
  history: any[] = [],
  opts: GenOptions & { schemaHint?: string } = {}
): Promise<{ ok: true; data: T } | { ok: false; raw: string; error?: string }> {
  const system =
    (opts.systemPrompt ? opts.systemPrompt + "\n" : "") +
    (opts.schemaHint
      ? `Réponds strictement au format JSON correspondant à ce schéma conceptuel: ${opts.schemaHint}. N'utilise pas de code fences.`
      : "Réponds strictement en JSON valide, sans code fences.");

  const text = await generateAssistantResponse(prompt, history, { ...opts, systemPrompt: system, temperature: 0.2 });
  try {
    const parsed = JSON.parse(text);
    return { ok: true, data: parsed as T };
  } catch (e: any) {
    return { ok: false, raw: text, error: "INVALID_JSON" };
  }
}

/**
 * (Optionnel) Streaming SSE côté routeur si tu veux diffuser en temps réel.
 * Exemple d’usage:
 *   const stream = await generateAssistantStream(prompt, history);
 *   for await (const chunk of stream) { ... }
 */
export async function* generateAssistantStream(
  prompt: string,
  history: any[] = [],
  opts: GenOptions = {}
): AsyncGenerator<string> {
  const model = opts.model || DEFAULTS.model;
  const temperature = opts.temperature ?? DEFAULTS.temperature;
  const max_tokens = opts.maxTokens ?? DEFAULTS.maxTokens;
  const timeoutMs = opts.timeoutMs ?? DEFAULTS.timeoutMs;

  const messages = buildMessages(prompt, history, opts.systemPrompt);

  // @ts-ignore: le streaming dépend de la version du SDK OpenAI
  const stream = await client.chat.completions.create(
    {
      model,
      messages,
      temperature,
      max_tokens,
      stream: true,
    },
    { timeout: timeoutMs }
  );

  // @ts-ignore: itère les deltas (selon version SDK)
  for await (const part of stream) {
    const delta = part?.choices?.[0]?.delta?.content;
    if (delta) yield delta as string;
  }
}

/* =================================
 * Utils exportés pour ton controller
 * ================================= */
export const AI_DEFAULTS = {
  model: DEFAULTS.model,
  temperature: DEFAULTS.temperature,
  maxTokens: DEFAULTS.maxTokens,
  timeoutMs: DEFAULTS.timeoutMs,
};
