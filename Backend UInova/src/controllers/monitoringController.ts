import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import os from "os";

// ✅ GET /monitoring/metrics → expose métriques système
export async function getMetrics(_req: Request, res: Response) {
  try {
    const metrics = {
      uptime: process.uptime(),
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
      },
      cpu: os.loadavg(), // moyenne sur 1, 5 et 15 minutes
      platform: os.platform(),
      arch: os.arch(),
      timestamp: Date.now(),
    };

    res.json(metrics);
  } catch (err) {
    console.error("❌ getMetrics error:", err);
    res.status(500).json({ message: "Erreur récupération métriques" });
  }
}

// ✅ GET /monitoring/logs → derniers logs (AuditLog)
export async function getLogs(_req: Request, res: Response) {
  try {
    const logs = await prisma.auditLog.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, email: true } },
      },
    });

    res.json(logs);
  } catch (err) {
    console.error("❌ getLogs error:", err);
    res.status(500).json({ message: "Erreur récupération logs" });
  }
}

// ✅ GET /monitoring/health → état serveur
export async function getHealth(_req: Request, res: Response) {
  try {
    res.json({
      ok: true,
      env: process.env.NODE_ENV || "development",
      version: process.env.APP_VERSION || "1.0.0",
      uptime: process.uptime(),
      timestamp: Date.now(),
    });
  } catch (err) {
    res.status(500).json({ message: "Erreur santé serveur" });
  }
}
