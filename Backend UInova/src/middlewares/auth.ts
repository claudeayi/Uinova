// src/middlewares/auth.ts
import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";

export type AppRole = "USER" | "PREMIUM" | "ADMIN";

export interface JwtPayload {
  sub?: string;                 // id utilisateur
  id?: string | number;         // compat ancien format
  email?: string;
  role?: string;                // USER | PREMIUM | ADMIN
  iat?: number;
  exp?: number;
}

export interface AuthUser {
  sub: string;                  // id utilisateur (stringifié)
  email?: string;
  role: AppRole;
  raw?: JwtPayload;             // payload brut pour logs/debug
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

/* ============================================================================
 * HELPERS
 * ========================================================================== */
function extractBearer(req: Request): string | null {
  const h = req.headers.authorization || req.headers.Authorization;
  if (!h || typeof h !== "string") return null;
  if (!h.startsWith("Bearer ")) return null;
  return h.slice("Bearer ".length).trim();
}

function normalizeRole(role?: string): AppRole {
  const r = (role || "USER").toUpperCase();
  if (r === "ADMIN") return "ADMIN";
  if (r === "PREMIUM") return "PREMIUM";
  return "USER";
}

function toAuthUser(payload: JwtPayload): AuthUser {
  const id = payload.sub ?? (payload.id != null ? String(payload.id) : undefined);
  if (!id) {
    const e: any = new Error("Invalid token payload: missing sub/id");
    e.status = 401;
    throw e;
  }
  return {
    sub: id,
    email: payload.email,
    role: normalizeRole(payload.role),
    raw: payload,
  };
}

/* ============================================================================
 * MIDDLEWARES
 * ========================================================================== */

/**
 * Attache l’utilisateur si un JWT valide est présent.
 * Ne bloque pas si absent ou invalide.
 */
export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  try {
    const token = extractBearer(req);
    if (!token) return next();
    const payload = verifyToken(token) as JwtPayload;
    req.user = toAuthUser(payload);
  } catch {
    // token invalide → on ignore
  }
  next();
}

/**
 * Exige un JWT valide, sinon 401.
 */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = extractBearer(req);
  if (!token) return res.status(401).json({ error: "Token manquant" });

  try {
    const payload = verifyToken(token) as JwtPayload;
    req.user = toAuthUser(payload);
    next();
  } catch (e: any) {
    const msg = e?.name === "TokenExpiredError" ? "Token expiré" : "Token invalide";
    return res.status(401).json({ error: msg });
  }
}

/**
 * Exige un rôle parmi la liste donnée.
 */
export function requireRole(roles: ("user" | "premium" | "admin")[]) {
  const allowed = new Set(roles.map(r => r.toUpperCase()));
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Non authentifié" });
    if (!allowed.has(req.user.role)) {
      return res.status(403).json({ error: "Accès refusé", required: [...allowed] });
    }
    next();
  };
}

/**
 * Vérifie si l’utilisateur a AU MOINS un certain rôle (hiérarchie USER < PREMIUM < ADMIN).
 */
export function requireRoleAtLeast(minRole: AppRole) {
  const order: AppRole[] = ["USER", "PREMIUM", "ADMIN"];
  const minIndex = order.indexOf(minRole);
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Non authentifié" });
    if (order.indexOf(req.user.role) < minIndex) {
      return res.status(403).json({ error: `Accès réservé aux ${minRole}+` });
    }
    next();
  };
}

/**
 * Vérifie que l’utilisateur agit sur sa propre ressource OU qu’il est admin.
 * Exemple: GET /users/:id
 */
export function requireSelfOrAdmin(paramKey = "id") {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Non authentifié" });
    if (req.user.role === "ADMIN") return next();

    if (req.params[paramKey] && req.params[paramKey] === req.user.sub) {
      return next();
    }
    return res.status(403).json({ error: "Accès interdit (self or admin required)" });
  };
}

/* ============================================================================
 * SHORTCUTS
 * ========================================================================== */
export const requireAdmin = requireRole(["admin"]);
export const requirePremium = requireRole(["premium", "admin"]);
export const requireAtLeastPremium = requireRoleAtLeast("PREMIUM");
export const requireAtLeastUser = requireRoleAtLeast("USER");
