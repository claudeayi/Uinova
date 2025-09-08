// src/middlewares/trackUsage.ts
import { prisma } from "../utils/prisma";
import { Request, Response, NextFunction } from "express";

/**
 * Middleware de tracking d’usage.
 * - Stocke chaque appel API en base (table usageRecord).
 * - Enrichi avec IP, UA, durée et métadonnées utiles.
 */
export async function trackUsage(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on("finish", async () => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return; // uniquement utilisateurs authentifiés

      const durationMs = Date.now() - start;
      const projectId = (req as any).projectId || null;

      // Détermination du type de consommation
      let type: string = "api_call";
      if (req.path.includes("/ai/")) type = "ai_call";
      else if (req.path.includes("/auth/")) type = "auth_call";
      else if (req.path.includes("/upload")) type = "upload";
      else if (req.method === "GET") type = "read";
      else if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method))
        type = "write";

      // Récupération IP + User-Agent
      const ip =
        (req.headers["cf-connecting-ip"] as string) ||
        (req.headers["x-real-ip"] as string) ||
        (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
        req.ip ||
        req.socket.remoteAddress ||
        "unknown";

      const userAgent = req.headers["user-agent"] || "unknown";

      // Insertion usageRecord
      await prisma.usageRecord.create({
        data: {
          userId,
          projectId,
          type,
          amount: 1,
          meta: {
            method: req.method,
            path: req.originalUrl,
            status: res.statusCode,
            durationMs,
            ip,
            userAgent,
          },
        },
      });
    } catch (e) {
      console.error("❌ trackUsage error:", (e as Error).message);
      // On n'empêche jamais la requête, c’est un tracking "best-effort"
    }
  });

  next();
}
