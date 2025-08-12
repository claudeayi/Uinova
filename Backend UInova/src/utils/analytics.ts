// src/utils/analytics.ts
import { Request, Response, NextFunction } from "express";

// Prisma (optionnel) : si ton schéma a un modèle AnalyticsEvent
// model AnalyticsEvent {
//   id        String   @id @default(cuid())
//   userId    String?
//   type      String
//   payload   Json
//   ip        String?
//   ua        String?
//   path      String?
//   sessionId String?
//   createdAt DateTime @default(now())
//   @@index([userId, type, createdAt])
// }
let prisma: any = null;
try { prisma = require("../utils/prisma").prisma || require("../utils/prisma").default; } catch { /* ok */ }

// =======================
// Types
// =======================
export type AnalyticsEventType =
  | "page.view"
  | "auth.login"
  | "auth.register"
  | "project.create"
  | "project.update"
  | "project.delete"
  | "page.update"
  | "export.create"
  | "payment.succeeded"
  | "payment.failed"
  | "ai.chat"
  | "error";

export type AnalyticsEvent = {
  id?: string;
  userId?: string | number | null;
  type: AnalyticsEventType | string;
  payload?: Record<string, any>;
  ip?: string | null;
  ua?: string | null;
  path?: string | null;
  sessionId?: string | null;
  createdAt?: Date;
};

// =======================
// Config
// =======================
const DISABLED = process.env.ANALYTICS_DISABLED === "1";
const BATCH_SIZE = Math.max(1, Number(process.env.ANALYTICS_BATCH_SIZE || 50));
const FLUSH_MS = Math.max(500, Number(process.env.ANALYTICS_FLUSH_MS || 5000));
const SAMPLE = Math.min(1, Math.max(0, Number(process.env.ANALYTICS_SAMPLE || 1))); // 0..1
const RL_PER_MIN = Math.max(10, Number(process.env.ANALYTICS_RL_PER_MIN || 600));   // rate limit/user

// =======================
// Mémoire (fallback + buffer)
// =======================
const memStore: AnalyticsEvent[] = [];          // stockage mémoire
const queue: AnalyticsEvent[] = [];             // batch à flusher
const rlMap: Map<string, { count: number; ts: number }> = new Map(); // rate-limit user

// =======================
// Utils
// =======================
function now() { return new Date(); }
function toUserId(v: any): string | null {
  if (v === undefined || v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) && String(n) === String(v) ? String(n) : String(v);
}
function sampled(): boolean {
  if (SAMPLE >= 1) return true;
  return Math.random() < SAMPLE;
}
function rlOk(userId: string | null): boolean {
  if (!userId) return true;
  const key = userId;
  const cur = rlMap.get(key);
  const t = Date.now();
  if (!cur || t - cur.ts > 60_000) {
    rlMap.set(key, { count: 1, ts: t });
    return true;
  }
  if (cur.count >= RL_PER_MIN) return false;
  cur.count += 1;
  return true;
}

function pickContext(req?: Partial<Request>) {
  if (!req) return {};
  const ip = (req.headers?.["x-forwarded-for"] as string)?.split(",")[0]?.trim() || (req.socket as any)?.remoteAddress || null;
  const ua = (req.headers?.["user-agent"] as string) || null;
  const path = (req as any).originalUrl || (req as any).url || null;
  const sessionId = ((req as any).session?.id || (req as any).id || null) as string | null;
  return { ip, ua, path, sessionId };
}

// =======================
// Core API
// =======================
/**
 * Enregistre un événement (bufferisé, échantillonné, rate-limité).
 * - Persiste via Prisma si disponible, sinon mémoire.
 */
export async function trackEvent(
  type: AnalyticsEventType | string,
  payload: Record<string, any> = {},
  opts?: { userId?: string | number | null; req?: Request; force?: boolean }
) {
  if (DISABLED) return;
  if (!opts?.force && !sampled()) return;

  const userId = toUserId(opts?.userId);
  if (!rlOk(userId)) return;

  const ctx = pickContext(opts?.req);
  const evt: AnalyticsEvent = {
    type,
    payload,
    userId,
    ...ctx,
    createdAt: now(),
  };

  // Buffer + mémoire
  queue.push(evt);
  memStore.push(evt);
  if (queue.length >= BATCH_SIZE) {
    // flush sans await (fire-and-forget)
    void flush().catch(() => {});
  }
}

/** Raccourcis courants */
export const track = {
  pageView: (path: string, opts?: { userId?: any; req?: Request }) =>
    trackEvent("page.view", { path }, opts),
  error: (message: string, meta?: any, opts?: { userId?: any; req?: Request }) =>
    trackEvent("error", { message, ...meta }, opts),
  aiChat: (tokens: number, opts?: { userId?: any; req?: Request }) =>
    trackEvent("ai.chat", { tokens }, opts),
  payment: (status: "succeeded" | "failed", amount: number, currency: string, opts?: { userId?: any; req?: Request }) =>
    trackEvent(`payment.${status}`, { amount, currency }, opts),
};

/**
 * Flush du buffer vers la DB (si Prisma dispo).
 * Retourne le nombre d’événements persistés.
 */
export async function flush(): Promise<number> {
  if (!queue.length) return 0;
  const batch = queue.splice(0, BATCH_SIZE);
  if (!prisma?.analyticsEvent?.createMany) {
    // Pas de modèle en DB : on reste en mémoire
    return batch.length;
  }
  try {
    const data = batch.map((e) => ({
      userId: e.userId ?? null,
      type: e.type,
      payload: e.payload ?? {},
      ip: e.ip ?? null,
      ua: e.ua ?? null,
      path: e.path ?? null,
      sessionId: e.sessionId ?? null,
      createdAt: e.createdAt ?? now(),
    }));
    const res = await prisma.analyticsEvent.createMany({ data, skipDuplicates: true });
    return res.count || data.length;
  } catch (err) {
    // En cas d’erreur DB, on remet au début de la queue pour retenter plus tard
    queue.unshift(...batch);
    return 0;
  }
}

/** Récupère des events (DB si dispo sinon mémoire) avec pagination/filtre */
export async function getEvents(filter: Partial<{ userId: string | number; type: string }>, opts?: { page?: number; pageSize?: number }) {
  const page = Math.max(1, opts?.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, opts?.pageSize ?? 50));

  // DB
  if (prisma?.analyticsEvent?.findMany) {
    const where: any = {};
    if (filter.userId != null) where.userId = String(filter.userId);
    if (filter.type) where.type = filter.type;
    const [total, items] = await Promise.all([
      prisma.analyticsEvent.count({ where }),
      prisma.analyticsEvent.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: { id: true, userId: true, type: true, payload: true, ip: true, ua: true, path: true, sessionId: true, createdAt: true },
      }),
    ]);
    return { items, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  // Mémoire
  const items = memStore
    .filter((log) => (!filter.userId || String(log.userId) === String(filter.userId)) && (!filter.type || log.type === filter.type))
    .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));

  const total = items.length;
  const slice = items.slice((page - 1) * pageSize, page * pageSize);
  return { items: slice, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

/** Export NDJSON (mémoire si pas de DB) */
export async function exportNdjson(filter: Partial<{ userId: string | number; type: string }>): Promise<string> {
  const { items } = await getEvents(filter, { page: 1, pageSize: 10_000 });
  return items.map((e) => JSON.stringify(e)).join("\n");
}

// =======================
// Middleware Express
// =======================
/**
 * Injecte un traçage minimal pour chaque requête API.
 * - Ajoute X-Request-Id si manquant
 * - Trace page.view pour GET (optionnel)
 */
export function analyticsMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.headers["x-request-id"]) res.setHeader("x-request-id", (req as any).id || `${Date.now()}-${Math.random().toString(36).slice(2)}`);

  // (Optionnel) tracer toutes les GET comme page.view API (désactive avec ANALYTICS_TRACE_GET=0)
  if (process.env.ANALYTICS_TRACE_GET !== "0" && req.method === "GET" && req.originalUrl?.startsWith("/api/")) {
    void track.pageView(req.originalUrl, { req, userId: (req as any).user?.id || (req as any).user?.sub || null });
  }
  next();
}

// Flush périodique
if (!DISABLED) {
  setInterval(() => {
    void flush().catch(() => {});
  }, FLUSH_MS).unref?.();
}

// =======================
// Helpers pour controllers
// =======================
export function trackControllerEvent(req: any, type: AnalyticsEventType | string, payload?: Record<string, any>) {
  return trackEvent(type, payload, { req, userId: req.user?.id || req.user?.sub || null });
}
