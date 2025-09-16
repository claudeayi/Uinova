// src/controllers/monitoringController.ts
import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import os from "os";
import fs from "fs";
import path from "path";

/* ============================================================================
 *  MONITORING CONTROLLER – métriques, logs, santé, profilage
 * ========================================================================== */

// ✅ JSON → /monitoring/metrics
export async function getMetrics(_req: Request, res: Response) {
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const cpuUsage = os.loadavg();
    const cores = os.cpus().length;

    const usersCount = await prisma.user.count();
    const projectsCount = await prisma.project.count();
    const orgsCount = await prisma.organization.count();

    // disque
    let diskTotal = 0;
    let diskFree = 0;
    try {
      const stat = fs.statSync(path.resolve("/"));
      diskTotal = stat.blksize || 0;
      diskFree = stat.blocks || 0;
    } catch {}

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
        cores,
        model: os.cpus()[0]?.model,
      },
      disk: {
        total: diskTotal,
        free: diskFree,
      },
      db: {
        usersCount,
        projectsCount,
        orgsCount,
      },
      alerts: {
        highMem: usedMem / totalMem > 0.9,
        highLoad: cpuUsage[0] > 2 * cores,
      },
      platform: os.platform(),
      arch: os.arch(),
      pid: process.pid,
      hostname: os.hostname(),
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
      ``,
      `# HELP nodejs_memory_total_bytes Mémoire totale`,
      `# TYPE nodejs_memory_total_bytes gauge`,
      `nodejs_memory_total_bytes ${totalMem}`,
      `nodejs_memory_used_bytes ${usedMem}`,
      `nodejs_memory_free_bytes ${freeMem}`,
      ``,
      `# HELP nodejs_load1 Charge CPU 1m`,
      `nodejs_load1 ${load1}`,
      `# HELP nodejs_load5 Charge CPU 5m`,
      `nodejs_load5 ${load5}`,
      `# HELP nodejs_load15 Charge CPU 15m`,
      `nodejs_load15 ${load15}`,
      ``,
      `# HELP app_users_total Nombre total d’utilisateurs`,
      `app_users_total ${usersCount}`,
      `# HELP app_projects_total Nombre total de projets`,
      `app_projects_total ${projectsCount}`,
      ``,
      `# HELP app_build_info Informations build`,
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

    const { userId, action, from, to } = req.query;

    const where: any = {};
    if (userId) where.userId = String(userId);
    if (action) where.action = String(action);
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(String(from));
      if (to) where.createdAt.lte = new Date(String(to));
    }

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

// ✅ Export logs JSON/CSV → /monitoring/logs/export
export async function exportLogs(req: Request, res: Response) {
  try {
    const format = (req.query.format as string) || "json";
    const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 1000 });

    if (format === "csv") {
      const csv = [
        "id,userId,action,details,createdAt",
        ...logs.map((l) =>
          [l.id, l.userId, l.action, (l.details || "").replace(/,/g, ";"), l.createdAt.toISOString()].join(",")
        ),
      ].join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=logs.csv");
      res.send(csv);
    } else {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", "attachment; filename=logs.json");
      res.send(JSON.stringify(logs, null, 2));
    }
  } catch (err) {
    console.error("❌ exportLogs error:", err);
    res.status(500).json({ success: false, message: "Erreur export logs" });
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
        alerts: {
          highMem: os.freemem() / os.totalmem() < 0.1,
          highLoad: os.loadavg()[0] > 2 * os.cpus().length,
        },
        timestamp: Date.now(),
      },
    });
  } catch (err) {
    console.error("❌ getOverview error:", err);
    res.status(500).json({ success: false, message: "Erreur récupération overview" });
  }
}

// ✅ Profilage serveur → /monitoring/profile
export async function getProfile(_req: Request, res: Response) {
  try {
    const mem = process.memoryUsage();
    const cpu = process.cpuUsage();
    res.json({
      success: true,
      data: {
        memory: mem,
        cpu,
        pid: process.pid,
        uptime: process.uptime(),
      },
    });
  } catch (err) {
    console.error("❌ getProfile error:", err);
    res.status(500).json({ success: false, message: "Erreur récupération profil" });
  }
}
