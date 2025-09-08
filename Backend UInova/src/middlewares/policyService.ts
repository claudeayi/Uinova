// src/middlewares/policyService.ts
import { Request, Response, NextFunction } from "express";

export type AppRole = "USER" | "PREMIUM" | "ADMIN" | "OWNER" | string;

/* ============================================================================
 * HELPERS
 * ========================================================================== */

/**
 * Normalise les rôles en majuscule
 */
function normalizeRole(role?: string): AppRole {
  return (role || "USER").toUpperCase();
}

/**
 * Vérifie si le rôle actuel est autorisé par hiérarchie
 * Exemple: ADMIN > PREMIUM > USER
 */
function hasRequiredRole(userRole: AppRole, allowed: AppRole[]): boolean {
  const hierarchy: Record<AppRole, number> = {
    USER: 1,
    PREMIUM: 2,
    ADMIN: 3,
    OWNER: 4, // pour ressources spécifiques (via ensureOwner)
  };
  const roleRank = hierarchy[normalizeRole(userRole)] ?? 0;
  return allowed.some((r) => roleRank >= (hierarchy[normalizeRole(r)] ?? 0));
}

/* ============================================================================
 * MIDDLEWARES POLICIES
 * ========================================================================== */

/**
 * Middleware générique : vérifie que l’utilisateur a un rôle autorisé
 * Exemple: router.get("/admin", authorize(["ADMIN"]))
 */
export function authorize(roles: AppRole[]) {
  const allowed = roles.map(normalizeRole);
  return (req: Request, res: Response, next: NextFunction) => {
    const role = normalizeRole((req as any).user?.role);

    if (!role) {
      return res.status(401).json({ error: "UNAUTHORIZED", message: "Non authentifié" });
    }

    if (!hasRequiredRole(role, allowed)) {
      return res.status(403).json({ error: "FORBIDDEN", message: "Accès interdit" });
    }

    next();
  };
}

/**
 * Middleware : vérifie que l’utilisateur est propriétaire OU ADMIN
 */
export function isOwner(getOwnerId: (req: Request) => string | number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "UNAUTHORIZED" });

    const ownerId = String(getOwnerId(req));
    if (user.id === ownerId || normalizeRole(user.role) === "ADMIN") {
      return next();
    }

    return res.status(403).json({ error: "FORBIDDEN", message: "Accès restreint" });
  };
}

/**
 * Middleware : propriétaire OU rôle spécifique (ex: MANAGER, ADMIN)
 */
export function isOwnerOrRole(getOwnerId: (req: Request) => string | number, roles: AppRole[]) {
  const allowed = roles.map(normalizeRole);
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "UNAUTHORIZED" });

    const ownerId = String(getOwnerId(req));
    const role = normalizeRole(user.role);

    if (user.id === ownerId || role === "ADMIN" || allowed.includes(role)) {
      return next();
    }

    return res.status(403).json({ error: "FORBIDDEN", message: "Accès restreint" });
  };
}

/* ============================================================================
 * UTILS (à utiliser dans les services/controllers)
 * ========================================================================== */

/**
 * Vérifie côté service que l’utilisateur peut accéder
 */
export function ensureRole(userRole: AppRole, roles: AppRole[]) {
  if (!hasRequiredRole(userRole, roles)) {
    const e: any = new Error("Accès interdit");
    e.status = 403;
    throw e;
  }
}

/**
 * Vérifie côté service que l’utilisateur est bien propriétaire ou ADMIN
 */
export function ensureOwner(userId: string | number, ownerId: string | number, role: AppRole) {
  if (String(userId) !== String(ownerId) && normalizeRole(role) !== "ADMIN") {
    const e: any = new Error("Accès restreint");
    e.status = 403;
    throw e;
  }
}
