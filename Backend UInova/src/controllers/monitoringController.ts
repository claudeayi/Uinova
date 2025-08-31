import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import os from "os";

/* ============================================================================
 *  MONITORING CONTROLLER – métriques, logs, santé
 * ========================================================================== */

// ✅ JSON → /monitoring/metrics
export async function getMetrics(_req: Request, res: Response) {
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    const usersCount = await prisma.user.count();
    const projectsCount = await prisma.project.count();

    const metrics = {
      uptime: process.uptime(),
      memory: {
        total: totalMem,
        free: freeMem,
        used: usedMem,
        usagePercent: ((usedMem / totalMem) * 100).toFixed(2) + "%",
      },
      cpu: {
        loadAvg: os.loadavg(), // 1, 5, 15 minutes
        cores: os.cpus().length,
      },
      db: {
        usersCount,
        projectsCount,
      },
      platform: os.platform(),
      arch: os.arch(),
      timestamp: Date.now(),
    };

    res.json({ success: true, data: metrics });
  } catch (err) {
    console.error("❌ getMetrics error:", err);
    res.status(500).json({ success: false, message: "Erreur récupération métriques" });
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

    const usersCount = await prisma.user.count();
    const projectsCount = await prisma.project.count();

    const lines: string[] = [
      `# HELP nodejs_uptime_seconds Uptime du processus Node.js`,
      `# TYPE nodejs_uptime_seconds counter`,
      `nodejs_uptime_seconds ${uptime.toFixed(2)}`,

      `# HELP nodejs_memory_total_bytes Mémoire totale`,
      `# TYPE nodejs_memory_total_bytes gauge`,
      `nodejs_memory_total_bytes ${totalMem}`,

      `# HELP nodejs_memory_free_bytes Mémoire libre`,
      `# TYPE nodejs_memory_free_bytes gauge`,
      `nodejs_memory_free_bytes ${freeMem}`,

      `# HELP nodejs_memory_used_bytes Mémoire utilisée`,
      `# TYPE nodejs_memory_used_bytes gauge`,
      `nodejs_memory_used_bytes ${usedMem}`,

      `# HELP nodejs_load1 Charge CPU 1m`,
      `# TYPE nodejs_load1 gauge`,
      `nodejs_load1 ${load1}`,

      `# HELP nodejs_load5 Charge CPU 5m`,
      `# TYPE nodejs_load5 gauge`,
      `nodejs_load5 ${load5}`,

      `# HELP nodejs_load15 Charge CPU 15m`,
      `# TYPE nodejs_load15 gauge`,
      `nodejs_load15 ${load15}`,

      `# HELP app_users_total Nombre total d’utilisateurs`,
      `# TYPE app_users_total gauge`,
      `app_users_total ${usersCount}`,

      `# HELP app_projects_total Nombre total de projets`,
      `# TYPE app_projects_total gauge`,
      `app_projects_total ${projectsCount}`,
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
      take: 100,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, email: true } },
      },
    });

    res.json({ success: true, data: logs });
  } catch (err) {
    console.error("❌ getLogs error:", err);
    res.status(500).json({ success: false, message: "Erreur récupération logs" });
  }
}

// ✅ Health → /monitoring/health
export async function getHealth(_req: Request, res: Response) {
  try {
    const dbOk = await prisma.$queryRaw`SELECT 1`; // test rapide DB

    res.json({
      success: true,
      data: {
        ok: true,
        db: !!dbOk,
        env: process.env.NODE_ENV || "development",
        version: process.env.APP_VERSION || "1.0.0",
        uptime: process.uptime(),
        timestamp: Date.now(),
      },
    });
  } catch (err) {
    console.error("❌ getHealth error:", err);
    res.status(500).json({ success: false, message: "Erreur santé serveur" });
  }
}

// ✅ Admin → /monitoring/overview (métriques + logs en un seul appel)
export async function getOverview(_req: Request, res: Response) {
  try {
    const metrics = await prisma.auditLog.count();
    const usersCount = await prisma.user.count();
    const projectsCount = await prisma.project.count();

    res.json({
      success: true,
      data: {
        logsCount: metrics,
        usersCount,
        projectsCount,
        uptime: process.uptime(),
        timestamp: Date.now(),
      },
    });
  } catch (err) {
    console.error("❌ getOverview error:", err);
    res.status(500).json({ success: false, message: "Erreur récupération overview" });
  }
}
