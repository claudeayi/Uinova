import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import os from "os";

// ✅ JSON → /monitoring/metrics
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

// ✅ Prometheus format → /monitoring/prometheus
export async function getPrometheusMetrics(_req: Request, res: Response) {
  try {
    const uptime = process.uptime();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const [load1, load5, load15] = os.loadavg();

    const lines: string[] = [
      `# HELP nodejs_uptime_seconds Uptime du processus Node.js`,
      `# TYPE nodejs_uptime_seconds counter`,
      `nodejs_uptime_seconds ${uptime.toFixed(2)}`,

      `# HELP nodejs_memory_total_bytes Mémoire totale du système`,
      `# TYPE nodejs_memory_total_bytes gauge`,
      `nodejs_memory_total_bytes ${totalMem}`,

      `# HELP nodejs_memory_free_bytes Mémoire libre`,
      `# TYPE nodejs_memory_free_bytes gauge`,
      `nodejs_memory_free_bytes ${freeMem}`,

      `# HELP nodejs_memory_used_bytes Mémoire utilisée`,
      `# TYPE nodejs_memory_used_bytes gauge`,
      `nodejs_memory_used_bytes ${usedMem}`,

      `# HELP nodejs_load1 Charge CPU sur 1 minute`,
      `# TYPE nodejs_load1 gauge`,
      `nodejs_load1 ${load1}`,

      `# HELP nodejs_load5 Charge CPU sur 5 minutes`,
      `# TYPE nodejs_load5 gauge`,
      `nodejs_load5 ${load5}`,

      `# HELP nodejs_load15 Charge CPU sur 15 minutes`,
      `# TYPE nodejs_load15 gauge`,
      `nodejs_load15 ${load15}`,
    ];

    res.setHeader("Content-Type", "text/plain");
    res.send(lines.join("\n"));
  } catch (err) {
    console.error("❌ getPrometheusMetrics error:", err);
    res.status(500).send("Erreur Prometheus metrics");
  }
}

// ✅ Logs → /monitoring/logs
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

// ✅ Health → /monitoring/health
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
