import { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error("API ERROR:", err);
  res.status(err.status || 500).json({
    message: err.message || "Erreur interne du serveur",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack })
  });
}
