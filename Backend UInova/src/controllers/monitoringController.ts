// src/controllers/monitoringController.ts
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
    const cpuUsage = os.loadavg();

    const usersCount = await prisma.user.count();
    const projectsCount = await prisma.project.count();
    const orgsCount = await prisma.organization.count();

    const metrics = {
      uptime: {
        seconds: process.uptime(),
        human: new Date(process.uptime() * 1000).toISOString().substr(11, 8),
      },
      memory: {
        total: totalMem,
        free: freeMem,
        used: usedMem,
        usagePercent: Number(((usedMem / totalMem) * 100).toFixed(2)),
      },
      cpu: {
        loadAvg: cpuUsage, // [1,5,15m]
        cores: os.cpus().length,
        model: os.cpus()[0]?.model,
      },
      db: {
        usersCount,
        projectsCount,
        orgsCount,
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

      `# HELP nodejs_memory_used_bytes Mémoire utilisée`,
      `# TYPE nodejs_memory_used_bytes gauge`,
      `nodejs_memory_used_bytes ${usedMem}`,

      `# HELP nodejs_memory_free_bytes Mémoire libre`,
      `# TYPE nodejs_memory_free_bytes gauge`,
      `nodejs_memory_free_bytes ${freeMem}`,

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

      `# HELP app_build_info Informations build`,
      `# TYPE app_build_info gauge`,
      `app_build_info{env="${process.env.NODE_ENV}",version="${process.env.APP_VERSION || "1.0.0"}"} 1`,
    ];

    res.setHeader("Content-Type", "text/plain; version=0.0.4");
    res.send(lines.join("\n"));
  } catch (err) {
    console.error("❌ getPrometheusMetrics error:", err);
    res.status(500).send("Erreur Prometheus metrics");
  }
}

// ✅ Logs → /monitoring/logs
export async function getLogs(req: Request, res: Response) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const userId = req.query.userId as string | undefined;
    const action = req.query.action as string | undefined;

    const where: any = {};
    if (userId) where.userId = userId;
    if (action) where.action = action;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, email: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("❌ getLogs error:", err);
    res.status(500).json({ success: false, message: "Erreur récupération logs" });
  }
}

// ✅ Health → /monitoring/health
export async function getHealth(_req: Request, res: Response) {
  try {
    const start = Date.now();
    const dbOk = await prisma.$queryRaw`SELECT 1`;
    const duration = Date.now() - start;

    res.json({
      success: true,
      data: {
        ok: true,
        db: { ok: !!dbOk, latencyMs: duration },
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

// ✅ Admin → /monitoring/overview
export async function getOverview(_req: Request, res: Response) {
  try {
    const [logsCount, usersCount, projectsCount, orgsCount, replaysCount] = await Promise.all([
      prisma.auditLog.count(),
      prisma.user.count(),
      prisma.project.count(),
      prisma.organization.count(),
      prisma.replaySession.count(),
    ]);

    res.json({
      success: true,
      data: {
        logsCount,
        usersCount,
        projectsCount,
        orgsCount,
        replaysCount,
        uptime: process.uptime(),
        timestamp: Date.now(),
      },
    });
  } catch (err) {
    console.error("❌ getOverview error:", err);
    res.status(500).json({ success: false, message: "Erreur récupération overview" });
  }
}
