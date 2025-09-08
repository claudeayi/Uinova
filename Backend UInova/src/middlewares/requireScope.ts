// src/middlewares/requireScope.ts
import { Request, Response, NextFunction } from "express";

/* ============================================================================
 * CONFIG
 * ========================================================================== */
export type Scope =
  | "read"
  | "write"
  | "delete"
  | "manage"
  | "billing"
  | "ai"
  | "admin"
  | string; // extensible

// hiérarchie simple → tu peux adapter selon tes besoins
const SCOPE_HIERARCHY: Record<string, number> = {
  READ: 1,
  WRITE: 2,
  DELETE: 3,
  MANAGE: 4,
  BILLING: 5,
  AI: 6,
  ADMIN: 99,
};

/* ============================================================================
 * HELPERS
 * ========================================================================== */
function normalizeScope(scope?: string): string | null {
  return scope ? scope.trim().toUpperCase() : null;
}

function hasRequiredScope(current: string, allowed: string[]): boolean {
  const rank = SCOPE_HIERARCHY[current] ?? 0;
  return allowed.some((s) => {
    const requiredRank = SCOPE_HIERARCHY[normalizeScope(s) || ""] ?? 0;
    return rank >= requiredRank;
  });
}

/* ============================================================================
 * MIDDLEWARE
 * ========================================================================== */

/**
 * Vérifie si la clé API / utilisateur possède un scope suffisant
 * Exemple d'usage:
 *   router.post("/create", apiKeyAuth, requireScope(["write"]), createProject);
 */
export function requireScope(allowedScopes: Scope[]) {
  const normalizedAllowed = allowedScopes.map((s) => normalizeScope(s)!);

  return (req: Request, res: Response, next: NextFunction) => {
    const rawScope = (req as any).apiKeyScope || (req as any).user?.role;
    const scope = normalizeScope(rawScope);

    if (!scope) {
      return res.status(401).json({ error: "UNAUTHORIZED", message: "Scope manquant" });
    }

    // 🚀 Bypass complet pour ADMIN
    if (scope === "ADMIN") {
      return next();
    }

    // Vérifie hiérarchie
    if (!hasRequiredScope(scope, normalizedAllowed)) {
      return res.status(403).json({
        error: "FORBIDDEN",
        message: `Accès refusé. Scope actuel: ${scope}, requis: ${normalizedAllowed.join(", ")}`,
      });
    }

    // 💾 Audit log éventuel
    if ((req as any).user?.id) {
      console.info(`[SCOPE] User ${req.user.id} accède à ${req.originalUrl} avec scope=${scope}`);
    }

    return next();
  };
}
