// src/middlewares/trackUsage.ts
import { prisma } from "../utils/prisma";
import { Request, Response, NextFunction } from "express";

export async function trackUsage(req: Request, res: Response, next: NextFunction) {
  res.on("finish", async () => {
    try {
      if (!req.user?.id) return;

      // Exemple : compter chaque appel d’API comme 1 "api_call"
      await prisma.usageRecord.create({
        data: {
          userId: req.user.id,
          projectId: (req as any).projectId || null,
          type: "api_call",
          amount: 1,
          meta: {
            method: req.method,
            path: req.path,
            status: res.statusCode,
          },
        },
      });
    } catch (e) {
      console.error("❌ trackUsage error:", e);
    }
  });

  next();
}
