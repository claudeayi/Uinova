// src/middlewares/requireScope.ts
import { Request, Response, NextFunction } from "express";

/**
 * Vérifie si la clé API / utilisateur possède un scope suffisant
 * Exemple d'usage:
 *    router.post("/create", apiKeyAuth, requireScope(["write"]), createProject);
 */
export function requireScope(allowedScopes: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const scope = (req as any).apiKeyScope || (req as any).user?.role;

    if (!scope) {
      return res.status(401).json({ error: "UNAUTHORIZED", message: "Scope manquant" });
    }

    // ⚡ Si utilisateur admin → bypass
    if (scope === "ADMIN" || scope === "admin") {
      return next();
    }

    if (!allowedScopes.includes(scope)) {
      return res.status(403).json({
        error: "FORBIDDEN",
        message: `Accès refusé. Scope requis: ${allowedScopes.join(", ")}`,
      });
    }

    return next();
  };
}
