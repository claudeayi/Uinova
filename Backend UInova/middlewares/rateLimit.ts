// src/middlewares/rateLimiter.ts
import rateLimit from "express-rate-limit";
import { Request } from "express";
import { prisma } from "../utils/prisma";

/* ============================================================================
 * CONFIG
 * ============================================================================
 */
const WINDOW_MINUTES = Number(process.env.RATE_LIMIT_WINDOW || 15);
const MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX || 300);

/**
 * Génère une clé unique pour le rate-limit
 * -> combine IP + userId (si connecté) pour plus de précision
 */
function keyGenerator(req: Request): string {
  const ip = req.ip || req.headers["x-forwarded-for"]?.toString() || "unknown";
  const userId = (req as any)?.user?.id || "guest";
  return `${userId}:${ip}`;
}

/**
 * Gestion custom quand la limite est atteinte
 */
async function handleLimit(req: Request, _res: any, _options: any) {
  const userId = (req as any)?.user?.id || null;
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action: "RATE_LIMIT_EXCEEDED",
        metadata: { path: req.originalUrl, ip: req.ip },
      },
    });
  } catch {
    /* ignorer si auditLog indispo */
  }
}

/* ============================================================================
 * MIDDLEWARE GLOBAL
 * ============================================================================
 */
export const rateLimiter = rateLimit({
  windowMs: WINDOW_MINUTES * 60 * 1000,
  max: MAX_REQUESTS,
  keyGenerator,
  handler: (req, res) => {
    handleLimit(req, res, {});
    res.status(429).json({
      success: false,
      error: "TOO_MANY_REQUESTS",
      message: `Trop de requêtes. Réessayez après ${WINDOW_MINUTES} minutes.`,
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/* ============================================================================
 * VARIANTES SPÉCIFIQUES
 * ============================================================================
 */
// Limiteur plus strict pour l’auth (login/register)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20, // max 20 tentatives
  keyGenerator,
  handler: (req, res) => {
    handleLimit(req, res, {});
    res.status(429).json({
      success: false,
      error: "AUTH_RATE_LIMIT",
      message: "Trop de tentatives d’authentification, réessayez plus tard.",
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});
