// src/middlewares/security.ts
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { Request } from "express";

/* ============================================================================
 *  HELMET — HEADERS DE SÉCURITÉ
 * ============================================================================
 */
const useCsp = process.env.SECURITY_CSP === "1";

export const securityHeaders = helmet({
  xPoweredBy: false, // masque Express
  frameguard: { action: "sameorigin" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: { maxAge: 15552000, includeSubDomains: true, preload: true }, // 180 jours
  contentSecurityPolicy: useCsp
    ? {
        useDefaults: true,
        directives: {
          "default-src": ["'self'"],
          "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:"],
          "style-src": ["'self'", "'unsafe-inline'", "https:"],
          "img-src": ["'self'", "data:", "blob:", "https:"],
          "font-src": ["'self'", "https:", "data:"],
          "connect-src": ["'self'", "https:", "wss:", "ws:"],
          "frame-ancestors": ["'self'"],
          "media-src": ["'self'", "data:", "blob:", "https:"],
          "worker-src": ["'self'", "blob:"],
        },
      }
    : false,
  // Désactive la XSS protection obsolète
  xssFilter: false as any,
});

/* ============================================================================
 *  HELPERS
 * ============================================================================
 */
function getClientIp(req: Request) {
  const xfwd =
    (req.headers["cf-connecting-ip"] as string) ||
    (req.headers["x-real-ip"] as string) ||
    (req.headers["x-forwarded-for"] as string) ||
    "";
  return (xfwd.split(",")[0] || req.ip || req.socket.remoteAddress || "").trim();
}

function limiterLog(name: string, req: Request) {
  console.warn(
    `[RATE_LIMIT] ${name} exceeded by IP=${getClientIp(req)} path=${req.originalUrl}`
  );
}

/* ============================================================================
 *  RATE LIMITERS
 * ============================================================================
 */

/**
 * API générique : 100 req / min par IP
 */
export const apiLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  max: Number(process.env.RATE_LIMIT_MAX || 100),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
  handler: (req, res, _next, _opts) => {
    limiterLog("API", req);
    res
      .status(429)
      .json({ error: "RATE_LIMITED", message: "Trop de requêtes, réessayez plus tard." });
  },
});

/**
 * Auth (login/register/refresh) : 10 req / 5 min
 */
export const authLimiter = rateLimit({
  windowMs: Number(process.env.AUTH_LIMIT_WINDOW_MS || 5 * 60_000),
  max: Number(process.env.AUTH_LIMIT_MAX || 10),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
  handler: (req, res) => {
    limiterLog("AUTH", req);
    res
      .status(429)
      .json({ error: "RATE_LIMITED", message: "Trop de tentatives, réessayez plus tard." });
  },
});

/**
 * Webhooks (Stripe, PayPal…) : 60 req / min
 */
export const webhookLimiter = rateLimit({
  windowMs: Number(process.env.WEBHOOK_LIMIT_WINDOW_MS || 60_000),
  max: Number(process.env.WEBHOOK_LIMIT_MAX || 60),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) =>
    (req.headers["stripe-signature"] as string) ||
    (req.headers["paypal-transmission-id"] as string) ||
    (req.headers["x-signature"] as string) ||
    getClientIp(req),
  handler: (req, res) => {
    limiterLog("WEBHOOK", req);
    res.status(429).json({ error: "RATE_LIMITED", message: "Webhook trop fréquent." });
  },
});

/**
 * AI endpoints : limites renforcées (prévenir abus GPT)
 */
export const aiLimiter = rateLimit({
  windowMs: Number(process.env.AI_LIMIT_WINDOW_MS || 60_000),
  max: Number(process.env.AI_LIMIT_MAX || 30),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
  handler: (req, res) => {
    limiterLog("AI", req);
    res
      .status(429)
      .json({ error: "RATE_LIMITED", message: "Trop de requêtes IA, réessayez plus tard." });
  },
});

/**
 * Admin routes : très strict (éviter brute force)
 */
export const adminLimiter = rateLimit({
  windowMs: Number(process.env.ADMIN_LIMIT_WINDOW_MS || 10 * 60_000),
  max: Number(process.env.ADMIN_LIMIT_MAX || 50),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
  handler: (req, res) => {
    limiterLog("ADMIN", req);
    res
      .status(429)
      .json({ error: "RATE_LIMITED", message: "Trop de requêtes admin détectées." });
  },
});
