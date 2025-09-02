import { Request, Response, NextFunction } from "express";

/**
 * Vérifie si l’utilisateur a un rôle autorisé
 */
export function authorize(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.user?.role;
    if (!role || !roles.includes(role)) {
      return res.status(403).json({ error: "FORBIDDEN", message: "Accès interdit" });
    }
    next();
  };
}

/**
 * Vérifie si l’utilisateur est propriétaire de la ressource
 */
export function isOwner(getOwnerId: (req: Request) => string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "UNAUTHORIZED" });
    const ownerId = getOwnerId(req);
    if (req.user.id !== ownerId && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "FORBIDDEN", message: "Accès restreint" });
    }
    next();
  };
}
