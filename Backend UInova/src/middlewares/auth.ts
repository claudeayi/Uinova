import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";

export interface AuthRequest extends Request {
  user?: { id: number; email: string; role: string };
}

export function auth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token manquant" });
  }
  try {
    const token = header.split(" ")[1];
    const payload = verifyToken(token) as { id: number; email: string; role: string };
    req.user = payload;
    next();
  } catch (e) {
    res.status(401).json({ message: "Token invalide" });
  }
}

// Middleware pour vérifier le rôle admin ou premium
export function requireRole(roles: ("user"|"premium"|"admin")[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Accès refusé" });
    }
    next();
  };
}
