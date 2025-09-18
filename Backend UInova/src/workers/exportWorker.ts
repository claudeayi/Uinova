import { Worker } from "bullmq";
import { queues } from "../utils/queue";
import { prisma } from "../utils/prisma";
import { exportToFormat } from "../services/exportService"; // service dédié aux exports multi-format

const EXPORT_TIMEOUT_MS = Number(process.env.EXPORT_TIMEOUT_MS || 1000 * 60 * 5); // 5 min max
const EXPORT_CONCURRENCY = Number(process.env.EXPORT_WORKER_CONCURRENCY || 3);

export const exportWorker = new Worker(
  "export",
  async (job) => {
    const { pageId, projectId, format = "json", userId } = job.data;
    const start = Date.now();

    console.log(
      `📦 [ExportWorker] Job ${job.id} reçu → page=${pageId} project=${projectId} format=${format}`
    );

    try {
      // ➡️ Sauvegarde log initial
      await prisma.exportLog.create({
        data: {
          jobId: job.id.toString(),
          pageId,
          projectId,
          format,
          status: "RUNNING",
          startedAt: new Date(),
        },
      });

      // ➡️ Génération via service export (gère JSON, HTML, React, Vue, Flutter, PDF…)
      const result = await exportToFormat({ pageId, projectId, format });

      const latency = Date.now() - start;

      // ✅ Log succès
      await prisma.exportLog.update({
        where: { jobId: job.id.toString() },
        data: {
          status: "SUCCESS",
          finishedAt: new Date(),
          latencyMs: latency,
          outputUrl: result.url || null,
        },
      });

      // ✅ Audit
      await prisma.auditLog.create({
        data: {
          userId: userId || null,
          action: "EXPORT_SUCCESS",
          metadata: { jobId: job.id, pageId, projectId, format, latency },
        },
      });

      console.log(
        `✅ [ExportWorker] Export ${format} pour page=${pageId} terminé (${latency}ms)`
      );

      return result;
    } catch (err: any) {
      console.error(`❌ [ExportWorker] Job ${job.id} erreur:`, err.message);

      // ❌ Log échec
      await prisma.exportLog.update({
        where: { jobId: job.id.toString() },
        data: {
          status: "FAILED",
          finishedAt: new Date(),
          error: err.message,
        },
      });

      // ❌ Audit
      await prisma.auditLog.create({
        data: {
          userId: job.data.userId || null,
          action: "EXPORT_FAILED",
          metadata: { jobId: job.id, pageId, projectId, format, error: err.message },
        },
      });

      throw err; // ➝ BullMQ retry
    } finally {
      const latency = Date.now() - start;
      console.log(`⏱️ [ExportWorker] Job ${job.id} terminé en ${latency}ms`);
    }
  },
  {
    connection: queues.export.opts.connection,
    concurrency: EXPORT_CONCURRENCY,
    lockDuration: EXPORT_TIMEOUT_MS,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  }
);

/* ============================================================================
 *  HOOKS DE MONITORING
 * ========================================================================== */
exportWorker.on("completed", (job) => {
  console.log(`📤 [ExportWorker] Job ${job.id} complété avec succès`);
});

exportWorker.on("failed", (job, err) => {
  console.error(
    `❌ [ExportWorker] Job ${job?.id} échoué après ${job?.attemptsMade} tentatives:`,
    err?.message
  );
});

exportWorker.on("stalled", (jobId) => {
  console.warn(`⚠️ [ExportWorker] Job ${jobId} stalled (bloqué)`);
});

exportWorker.on("progress", (job, progress) => {
  console.log(`⏳ [ExportWorker] Job ${job.id} progression: ${progress}%`);
});
