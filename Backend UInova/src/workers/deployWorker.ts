// src/workers/deployWorker.ts
import { Worker } from "bullmq";
import { queues } from "../utils/queue";
import { prisma } from "../utils/prisma";

const DEPLOY_TIMEOUT_MS = 1000 * 60 * 10; // 10 min max

/* ============================================================================
 *  DEPLOY WORKER – Orchestration des déploiements
 * ========================================================================== */
export const deployWorker = new Worker(
  "deploy",
  async (job) => {
    const { projectId, env, provider = "mock" } = job.data;
    const deployId = job.id.toString();
    const start = Date.now();

    console.log(`🚀 [Deploy Worker] Job reçu: ${projectId} (${env})`);

    try {
      // ➡️ Statut : RUNNING
      await prisma.deployment.update({
        where: { id: deployId },
        data: { status: "RUNNING", startedAt: new Date() },
      });

      await prisma.deployLog.create({
        data: {
          deploymentId: deployId,
          level: "info",
          message: `Déploiement démarré pour ${projectId} (${env}) via ${provider}`,
        },
      });

      // 🔧 Simulation provider
      switch (provider) {
        case "mock":
          await new Promise((r) => setTimeout(r, 5000));
          break;
        case "vercel":
          // TODO: intégrer API Vercel
          break;
        case "netlify":
          // TODO: intégrer API Netlify
          break;
        case "aws":
          // TODO: intégration AWS
          break;
        default:
          throw new Error(`Provider ${provider} non supporté`);
      }

      // ➡️ Succès
      const targetUrl = `https://${projectId}.${env}.uinova.dev`;
      await prisma.deployment.update({
        where: { id: deployId },
        data: { status: "SUCCESS", finishedAt: new Date(), targetUrl },
      });

      await prisma.deployLog.create({
        data: {
          deploymentId: deployId,
          level: "success",
          message: `Déploiement terminé avec succès: ${targetUrl}`,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: job.data.userId || null,
          action: "DEPLOY_SUCCESS",
          metadata: { projectId, env, provider, deployId, targetUrl },
        },
      });

      console.log(`✅ [Deploy Worker] Déploiement réussi: ${targetUrl}`);
    } catch (err: any) {
      console.error("❌ [Deploy Worker] Erreur déploiement:", err);

      // ➡️ Rollback & statut FAILED
      await prisma.deployment.update({
        where: { id: deployId },
        data: { status: "FAILED", finishedAt: new Date(), error: err.message },
      });

      await prisma.deployLog.create({
        data: {
          deploymentId: deployId,
          level: "error",
          message: `Échec du déploiement: ${err.message}`,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: job.data.userId || null,
          action: "DEPLOY_FAILED",
          metadata: { projectId, env, provider, error: err.message },
        },
      });

      throw err; // ⬅️ Laisse BullMQ gérer retry/backoff
    } finally {
      const latency = Date.now() - start;

      await prisma.deployLog.create({
        data: {
          deploymentId: deployId,
          level: "info",
          message: `Durée totale: ${latency}ms`,
        },
      });

      console.log(`⏱️ [Deploy Worker] Job ${deployId} terminé en ${latency}ms`);
    }
  },
  {
    connection: queues.deploy.opts.connection,
    concurrency: Number(process.env.DEPLOY_WORKER_CONCURRENCY || 3),
    lockDuration: DEPLOY_TIMEOUT_MS,
    removeOnComplete: { count: 100 }, // plus d’historique
    removeOnFail: { count: 500 },
  }
);

/* ============================================================================
 *  HOOKS – Monitoring avancé
 * ========================================================================== */
deployWorker.on("completed", (job, result) => {
  console.log(`✅ [Deploy Worker] Job ${job.id} complété avec succès`, result);
});

deployWorker.on("failed", (job, err) => {
  console.error(`❌ [Deploy Worker] Job ${job.id} échoué:`, err?.message);
});

deployWorker.on("stalled", (jobId) => {
  console.warn(`⚠️ [Deploy Worker] Job ${jobId} stalled (bloqué)`);
});
