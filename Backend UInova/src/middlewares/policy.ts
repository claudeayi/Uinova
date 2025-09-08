// src/middlewares/authorize.ts
import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "./auth"; // ton type enrichi qui contient req.user

/* ============================================================================
 * HELPERS
 * ========================================================================== */
function normalizeRole(role?: string): "USER" | "PREMIUM" | "ADMIN" {
  const r = (role || "USER").toUpperCase();
  if (r === "ADMIN") return "ADMIN";
  if (r === "PREMIUM") return "PREMIUM";
  return "USER";
}

/* ============================================================================
 * MIDDLEWARES
 * ========================================================================== */

/**
 * Vérifie que l’utilisateur a un rôle autorisé
 * Exemple: router.get("/admin", authorize(["ADMIN"]))
 */
export function authorize(roles: string[]) {
  const allowed = roles.map(r => r.toUpperCase());
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "UNAUTHORIZED", message: "Non authentifié" });

    const role = normalizeRole(req.user.role);
    if (role === "ADMIN" || allowed.includes(role)) {
      return next();
    }

    if (process.env.NODE_ENV !== "production") {
      console.warn(`[Authorize] Refusé: user=${req.user.sub} role=${req.user.role} required=${roles.join(",")}`);
    }

    return res.status(403).json({ error: "FORBIDDEN", message: "Accès interdit" });
  };
}

/**
 * Vérifie si l’utilisateur est propriétaire de la ressource
 * ou ADMIN.
 * getOwnerId = fonction qui extrait l’ownerId de la requête
 */
export function isOwner(getOwnerId: (req: Request) => string | number) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "UNAUTHORIZED", message: "Non authentifié" });

    const ownerId = String(getOwnerId(req));
    if (req.user.sub === ownerId || normalizeRole(req.user.role) === "ADMIN") {
      return next();
    }

    if (process.env.NODE_ENV !== "production") {
      console.warn(`[isOwner] Refusé: user=${req.user.sub} owner=${ownerId}`);
    }

    return res.status(403).json({ error: "FORBIDDEN", message: "Accès restreint" });
  };
}

/**
 * Vérifie si l’utilisateur est propriétaire OU possède un rôle spécifique
 * Exemple: isOwnerOrRole(req => req.params.userId, ["ADMIN","MANAGER"])
 */
export function isOwnerOrRole(getOwnerId: (req: Request) => string | number, roles: string[]) {
  const allowed = roles.map(r => r.toUpperCase());
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "UNAUTHORIZED" });

    const ownerId = String(getOwnerId(req));
    const role = normalizeRole(req.user.role);

    if (req.user.sub === ownerId || role === "ADMIN" || allowed.includes(role)) {
      return next();
    }

    return res.status(403).json({ error: "FORBIDDEN", message: "Accès restreint" });
  };
}

/* ============================================================================
 * UTILS
 * ========================================================================== */

/**
 * Helper utilisable dans un controller (hors middleware)
 */
export function ensureOwner(req: AuthRequest, ownerId: string | number) {
  if (!req.user) {
    const e: any = new Error("Non authentifié");
    e.status = 401;
    throw e;
  }
  const role = normalizeRole(req.user.role);
  if (req.user.sub !== String(ownerId) && role !== "ADMIN") {
    const e: any = new Error("Accès interdit");
    e.status = 403;
    throw e;
  }
}

/**
 * Shortcut requireRole("ADMIN")
 */
export function requireRole(role: "USER" | "PREMIUM" | "ADMIN") {
  return authorize([role]);
}
