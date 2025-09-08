// src/middlewares/errorHandler.ts
import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import crypto from "crypto";
import { prisma } from "../utils/prisma";

/* ============================================================================
 * TYPES
 * ========================================================================== */
type HttpStatus = 400 | 401 | 403 | 404 | 408 | 409 | 413 | 415 | 422 | 429 | 500 | 502 | 503 | 504;
type NormalizedError = {
  status: HttpStatus;
  code?: string;
  message: string;
  details?: any;
};

const isDev = process.env.NODE_ENV !== "production";

/* ============================================================================
 * NORMALIZER
 * ========================================================================== */
function normalizeError(err: any): NormalizedError {
  // 1) Zod validation
  if (err instanceof ZodError) {
    return {
      status: 400,
      code: "VALIDATION_ERROR",
      message: "Requête invalide",
      details: err.flatten(),
    };
  }

  // 2) Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return { status: 409, code: "UNIQUENESS_VIOLATION", message: "Conflit: valeur déjà utilisée.", details: err.meta };
    }
    if (err.code === "P2025") {
      return { status: 404, code: "RECORD_NOT_FOUND", message: "Ressource introuvable.", details: err.meta };
    }
    return { status: 400, code: err.code, message: "Erreur base de données Prisma.", details: err.meta };
  }

  // 3) Multer upload
  if (err?.name === "MulterError") {
    const map: Record<string, NormalizedError> = {
      LIMIT_FILE_SIZE: { status: 413, code: "UPLOAD_TOO_LARGE", message: "Fichier trop volumineux." },
      LIMIT_FILE_COUNT: { status: 413, code: "UPLOAD_TOO_MANY", message: "Trop de fichiers." },
      LIMIT_UNEXPECTED_FILE: { status: 415, code: "UPLOAD_UNEXPECTED", message: "Type de fichier non pris en charge." },
    };
    return map[err.code] ?? { status: 400, code: "UPLOAD_ERROR", message: "Erreur d’upload." };
  }

  // 4) Body parser JSON
  if (err instanceof SyntaxError && (err as any).status === 400 && "body" in err) {
    return { status: 400, code: "BAD_JSON", message: "JSON mal formé." };
  }

  // 5) JWT / Auth
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

  // 6) Rate limiting
  if (err?.status === 429 || err?.statusCode === 429) {
    return { status: 429, code: "RATE_LIMITED", message: "Trop de requêtes, réessayez plus tard." };
  }

  // 7) Stripe
  if (err?.type?.toString?.().includes("Stripe") || err?.rawType === "card_error") {
    return { status: 400, code: "STRIPE_ERROR", message: err?.message || "Erreur de paiement Stripe." };
  }
  if (err?.type === "StripeSignatureVerificationError") {
    return { status: 400, code: "STRIPE_SIGNATURE", message: "Signature Stripe invalide." };
  }

  // 8) API externes (Axios/Fetch/OpenAI/etc.)
  if (err?.response?.status) {
    return {
      status: (err.response.status as HttpStatus) || 500,
      code: err.code || "EXTERNAL_API_ERROR",
      message: err.response.data?.error?.message || err.response.statusText || "Erreur API externe.",
      details: isDev ? err.response.data : undefined,
    };
  }

  // 9) Réseau (timeout, DNS, refus)
  if (err?.code === "ECONNREFUSED" || err?.code === "ENOTFOUND") {
    return { status: 503, code: "SERVICE_UNAVAILABLE", message: "Service externe indisponible." };
  }
  if (err?.code === "ETIMEDOUT" || err?.message?.includes("timeout")) {
    return { status: 504, code: "TIMEOUT", message: "Délai d’attente dépassé." };
  }

  // 10) Custom app errors
  if (typeof err?.status === "number" && err?.message) {
    const status = (err.status as HttpStatus) || 500;
    return { status, code: err.code || "APP_ERROR", message: err.message, details: err.details };
  }

  // 11) Fallback
  return { status: 500, code: "INTERNAL_ERROR", message: "Erreur interne du serveur." };
}

/* ============================================================================
 * MIDDLEWARES
 * ========================================================================== */
export function requestId(req: Request, res: Response, next: NextFunction) {
  const hdr = (req.headers["x-request-id"] as string) || undefined;
  res.locals.requestId = hdr || crypto.randomBytes(8).toString("hex") + Date.now().toString(36);
  res.setHeader("X-Request-Id", res.locals.requestId);
  next();
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: "Not Found" });
}

export async function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  const normalized = normalizeError(err);

  // Logging
  const logPayload = {
    requestId: res.locals.requestId,
    method: req.method,
    path: req.originalUrl,
    status: normalized.status,
    code: normalized.code,
    msg: normalized.message,
  };
  if (normalized.status >= 500) {
    console.error("API_ERROR", logPayload, isDev ? err : undefined);
  } else {
    console.warn("API_WARN", logPayload);
  }

  // Audit log en DB (optionnel)
  try {
    await prisma.auditLog.create({
      data: {
        userId: (req as any)?.user?.id || null,
        action: "API_ERROR",
        metadata: logPayload,
      },
    });
  } catch {
    /* ignore si audit non dispo */
  }

  const body: any = {
    error: normalized.code || "ERROR",
    message: normalized.message,
    requestId: res.locals.requestId,
  };
  if (normalized.details && isDev) body.details = normalized.details;
  if (isDev && err?.stack) body.stack = err.stack;

  res.status(normalized.status).json(body);
}

/* ============================================================================
 * UTILS
 * ========================================================================== */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Crée une erreur HTTP custom à thrower facilement
 */
export function throwHttpError(status: HttpStatus, message: string, code = "APP_ERROR", details?: any) {
  const e: any = new Error(message);
  e.status = status;
  e.code = code;
  e.details = details;
  throw e;
}
