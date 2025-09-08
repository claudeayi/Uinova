// src/routes/system.ts
import { Router } from "express";
import os from "os";

const r = Router();

/* ============================================================================
 * SYSTEM & HEALTH ROUTES
 * ========================================================================== */

/**
 * GET /system
 * Retourne un état général de l’API (uptime, mémoire, plateforme…)
 */
r.get("/", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({
    ok: true,
    uptime: process.uptime(),
    timestamp: Date.now(),
    version: process.env.npm_package_version || "dev",
    node: process.version,
    platform: os.platform(),
    arch: os.arch(),
    memory: {
      rss: process.memoryUsage().rss,
      heapUsed: process.memoryUsage().heapUsed,
      heapTotal: process.memoryUsage().heapTotal,
    },
    cpu: os.loadavg(),
  });
});

/**
 * GET /system/ready
 * Vérifie si le service est prêt (par ex: DB connectée).
 * Ici, mock → retourne toujours 200. Tu peux enrichir avec Prisma check.
 */
r.get("/ready", async (_req, res) => {
  try {
    // Exemple: await prisma.$queryRaw`SELECT 1`;
    res.sendStatus(200);
  } catch {
    res.sendStatus(503);
  }
});

/**
 * GET /system/live
 * Vérifie si le process est vivant (liveness probe k8s/docker).
 */
r.get("/live", (_req, res) => {
  res.sendStatus(200);
});

/**
 * GET /system/metrics
 * Endpoint prometheus-friendly (à enrichir avec prom-client si besoin).
 */
r.get("/metrics", (_req, res) => {
  res.setHeader("Content-Type", "text/plain; version=0.0.4");
  res.send(`# HELP process_uptime_seconds Process uptime in seconds
# TYPE process_uptime_seconds gauge
process_uptime_seconds ${process.uptime()}

# HELP process_memory_rss_bytes Resident set size in bytes
# TYPE process_memory_rss_bytes gauge
process_memory_rss_bytes ${process.memoryUsage().rss}

# HELP process_heap_used_bytes Heap used in bytes
# TYPE process_heap_used_bytes gauge
process_heap_used_bytes ${process.memoryUsage().heapUsed}
`);
});

/**
 * GET /system/ping
 * Simple pong pour test rapide / debug.
 */
r.get("/ping", (_req, res) => {
  res.json({ pong: true, ts: Date.now() });
});

export default r;
