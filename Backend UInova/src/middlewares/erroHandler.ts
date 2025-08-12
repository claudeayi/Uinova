// src/middlewares/errorHandler.ts
import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

// Types d'erreurs possibles (facultatif)
type HttpStatus = 400 | 401 | 403 | 404 | 409 | 413 | 415 | 422 | 429 | 500;
type NormalizedError = {
  status: HttpStatus;
  code?: string;
  message: string;
  details?: any;
};

const isDev = process.env.NODE_ENV !== "production";

/**
 * Normalise les erreurs connues vers un format stable pour le front.
 */
function normalizeError(err: any): NormalizedError {
  // 1) Erreurs de validation Zod
  if (err instanceof ZodError) {
    return {
      status: 400,
      code: "VALIDATION_ERROR",
      message: "Requête invalide",
      details: err.flatten(),
    };
  }

  // 2) Erreurs Prisma
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // https://www.prisma.io/docs/reference/api-reference/error-reference
    if (err.code === "P2002") {
      return { status: 409, code: "UNIQUENESS_VIOLATION", message: "Conflit: valeur déjà utilisée.", details: err.meta };
    }
    if (err.code === "P2025") {
      return { status: 404, code: "RECORD_NOT_FOUND", message: "Ressource introuvable.", details: err.meta };
    }
    return { status: 400, code: err.code, message: "Erreur de requête base de données.", details: err.meta };
  }

  // 3) Multer (upload)
  if (err?.name === "MulterError") {
    const map: Record<string, NormalizedError> = {
      LIMIT_FILE_SIZE: { status: 413, code: "UPLOAD_TOO_LARGE", message: "Fichier trop volumineux." },
      LIMIT_FILE_COUNT: { status: 413, code: "UPLOAD_TOO_MANY", message: "Trop de fichiers." },
      LIMIT_UNEXPECTED_FILE: { status: 415, code: "UPLOAD_UNEXPECTED", message: "Type de fichier non pris en charge." },
    };
    return map[err.code] ?? { status: 400, code: "UPLOAD_ERROR", message: "Erreur d’upload." };
  }

  // 4) Body parser JSON (SyntaxError)
  if (err instanceof SyntaxError && (err as any).status === 400 && "body" in err) {
    return { status: 400, code: "BAD_JSON", message: "JSON mal formé." };
  }

  // 5) JWT / Auth (ex: jsonwebtoken, verifyToken)
  if (err?.name === "UnauthorizedError" || err?.code === "INVALID_TOKEN") {
    return { status: 401, code: "INVALID_TOKEN", message: "Token invalide." };
  }
  if (err?.code === "TOKEN_EXPIRED") {
    return { status: 401, code: "TOKEN_EXPIRED", message: "Session expirée." };
  }
  if (err?.status === 401) {
    return { status: 401, code: "UNAUTHORIZED", message: err.message || "Non authentifié." };
  }
  if (err?.status === 403) {
    return { status: 403, code: "FORBIDDEN", message: err.message || "Accès refusé." };
  }

  // 6) Rate limit (express-rate-limit)
  if (err?.status === 429 || err?.statusCode === 429) {
    return { status: 429, code: "RATE_LIMITED", message: "Trop de requêtes, réessayez plus tard." };
  }

  // 7) Stripe (signatures webhook, etc.)
  if (err?.type?.toString?.().includes("Stripe") || err?.rawType === "card_error") {
    return { status: 400, code: "STRIPE_ERROR", message: err?.message || "Erreur de paiement Stripe." };
  }
  if (err?.type === "StripeSignatureVerificationError") {
    return { status: 400, code: "STRIPE_SIGNATURE", message: "Signature Stripe invalide." };
  }

  // 8) Erreurs applicatives custom avec status
  if (typeof err?.status === "number" && err?.message) {
    const status = (err.status as HttpStatus) || 500;
    return { status, code: err.code || "APP_ERROR", message: err.message, details: err.details };
  }

  // 9) Fallback
  return { status: 500, code: "INTERNAL_ERROR", message: "Erreur interne du serveur." };
}

/**
 * Ajoute un requestId dans res.locals pour le corréler dans les logs.
 */
export function requestId(req: Request, res: Response, next: NextFunction) {
  const hdr = (req.headers["x-request-id"] as string) || undefined;
  res.locals.requestId = hdr || cryptoSafeId();
  res.setHeader("X-Request-Id", res.locals.requestId);
  next();
}

function cryptoSafeId() {
  // petit id pseudo-aléatoire pour la corrélation
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/**
 * 404 Not Found handler (à placer après toutes les routes).
 */
export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: "Not Found" });
}

/**
 * Error handler central.
 */
export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  const normalized = normalizeError(err);

  // Log serveur (évite d'imprimer des payloads sensibles)
  const logPayload = {
    requestId: res.locals.requestId,
    method: req.method,
    path: req.originalUrl,
    status: normalized.status,
    code: normalized.code,
    msg: normalized.message,
  };
  // eslint-disable-next-line no-console
  console.error("API_ERROR", logPayload, isDev ? err : undefined);

  const body: any = {
    error: normalized.code || "ERROR",
    message: normalized.message,
    requestId: res.locals.requestId,
  };
  if (normalized.details && isDev) body.details = normalized.details;
  if (isDev && err?.stack) body.stack = err.stack;

  res.status(normalized.status).json(body);
}

/**
 * Helper pour wrapper des handlers async sans try/catch
 * usage: router.get('/', asyncHandler(async (req,res)=>{ ... }))
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);
