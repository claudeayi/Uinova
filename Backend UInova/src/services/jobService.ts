// src/services/queueMetrics.ts
import { exportQueue, deployQueue, aiQueue } from "../queues";
import client from "prom-client";
import { emitEvent } from "./eventBus";
import { auditLog } from "./auditLogService";
import { logger } from "../utils/logger";

/* ============================================================================
 * 📊 Prometheus Metrics
 * ============================================================================
 */
const jobDuration = new client.Histogram({
  name: "uinova_job_duration_seconds",
  help: "Durée des jobs par queue",
  labelNames: ["queue", "status"] as const,
  buckets: [0.5, 1, 2, 5, 10, 30, 60, 120],
});

const jobCounter = new client.Counter({
  name: "uinova_jobs_total",
  help: "Nombre total de jobs traités",
  labelNames: ["queue", "status"] as const,
});

/* ============================================================================
 * Stats par queue
 * ============================================================================
 */
export async function getQueueStats() {
  const queues = [
    { name: "export", queue: exportQueue },
    { name: "deploy", queue: deployQueue },
    { name: "ai", queue: aiQueue },
  ];

  const stats: any[] = [];
  for (const { name, queue } of queues) {
    const counts = await queue.getJobCounts(
      "waiting",
      "active",
      "completed",
      "failed",
      "delayed"
    );
    stats.push({
      queue: name,
      ...counts,
    });
  }
  return stats;
}

/* ============================================================================
 * Hooker Prometheus + Audit + EventBus sur chaque job
 * ============================================================================
 */
function attachMetrics(queue: any, name: string) {
  queue.on("completed", async (job: any, result: any, duration: number) => {
    const durSec = duration ? duration / 1000 : job.processedOn ? (Date.now() - job.processedOn) / 1000 : 0;
    jobDuration.labels(name, "success").observe(durSec);
    jobCounter.inc({ queue: name, status: "success" });

    await auditLog.log(job.data?.userId || "system", "JOB_COMPLETED", {
      queue: name,
      jobId: job.id,
      duration: durSec,
    });
    emitEvent("job.completed", { queue: name, jobId: job.id, duration: durSec });
    logger.info(`✅ Job completed [${name}] id=${job.id} (${durSec.toFixed(2)}s)`);
  });

  queue.on("failed", async (job: any, err: any) => {
    const durSec = job.processedOn ? (Date.now() - job.processedOn) / 1000 : 0;
    jobDuration.labels(name, "failed").observe(durSec);
    jobCounter.inc({ queue: name, status: "failed" });

    await auditLog.log(job.data?.userId || "system", "JOB_FAILED", {
      queue: name,
      jobId: job.id,
      error: err?.message,
      duration: durSec,
    });
    emitEvent("job.failed", { queue: name, jobId: job.id, error: err?.message, duration: durSec });
    logger.error(`❌ Job failed [${name}] id=${job.id}`, err?.message);
  });

  queue.on("stalled", async (job: any) => {
    jobCounter.inc({ queue: name, status: "stalled" });
    await auditLog.log(job.data?.userId || "system", "JOB_STALLED", {
      queue: name,
      jobId: job.id,
    });
    emitEvent("job.stalled", { queue: name, jobId: job.id });
    logger.warn(`⚠️ Job stalled [${name}] id=${job.id}`);
  });
}

/* ============================================================================
 * Attachement aux queues principales
 * ============================================================================
 */
attachMetrics(exportQueue, "export");
attachMetrics(deployQueue, "deploy");
attachMetrics(aiQueue, "ai");
