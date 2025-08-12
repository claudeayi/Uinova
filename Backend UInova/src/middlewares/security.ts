// src/middlewares/security.ts
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { Request } from "express";

/**
 * Helmet — durcissement des en-têtes.
 * CSP est désactivé par défaut pour éviter de casser l’éditeur/preview.
 * Active-la en prod en renseignant SECURITY_CSP=1 et adapte les sources.
 */
const useCsp = process.env.SECURITY_CSP === "1";

export const securityHeaders = helmet({
  xPoweredBy: false,
  frameguard: { action: "sameorigin" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "cross-origin" }, // utile si tu sers des assets publics
  contentSecurityPolicy: useCsp
    ? {
        useDefaults: true,
        directives: {
          // ⚠️ adapte selon ton front/éditeurs/iframes
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
  // Désactive la protection XSS de navigateur obsolète
  xssFilter: false as any,
});

/** Utilitaire pour retrouver l’IP client (derrière proxy/load balancer) */
function getClientIp(req: Request) {
  const xfwd = (req.headers["x-forwarded-for"] as string) || "";
  return (xfwd.split(",")[0] || req.ip || req.socket.remoteAddress || "").trim();
}

/**
 * Rate limit générique API.
 * Par défaut: 100 requêtes / 60s / IP.
 * Configure via env: RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX
 */
export const apiLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  max: Number(process.env.RATE_LIMIT_MAX || 100),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
  message: { error: "RATE_LIMITED", message: "Trop de requêtes, réessayez plus tard." },
});

/**
 * Limiteur plus strict pour Auth (login/register/refresh).
 * Par défaut: 10 req / 5 min / IP.
 */
export const authLimiter = rateLimit({
  windowMs: Number(process.env.AUTH_LIMIT_WINDOW_MS || 5 * 60_000),
  max: Number(process.env.AUTH_LIMIT_MAX || 10),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
  message: { error: "RATE_LIMITED", message: "Trop de tentatives, réessayez plus tard." },
});

/**
 * Limiteur pour Webhooks (Stripe, etc.) — identifiant par signature si dispo.
 * Par défaut: 60 req / 60s.
 */
export const webhookLimiter = rateLimit({
  windowMs: Number(process.env.WEBHOOK_LIMIT_WINDOW_MS || 60_000),
  max: Number(process.env.WEBHOOK_LIMIT_MAX || 60),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) =>
    (req.headers["stripe-signature"] as string) ||
    (req.headers["x-signature"] as string) ||
    getClientIp(req),
  message: { error: "RATE_LIMITED", message: "Webhook trop fréquent." },
});
