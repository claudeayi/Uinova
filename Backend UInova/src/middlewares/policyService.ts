// src/middlewares/policyService.ts
import { Request, Response, NextFunction } from "express";

export function authorize(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;
    if (!userRole || !roles.includes(userRole)) {
      return res.status(403).json({ error: "Accès interdit" });
    }
    next();
  };
}
