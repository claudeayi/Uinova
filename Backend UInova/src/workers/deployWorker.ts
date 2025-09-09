import { Worker } from "bullmq";
import { queues } from "../utils/queue";
import { prisma } from "../utils/prisma";

const DEPLOY_TIMEOUT_MS = 1000 * 60 * 10; // 10 min max

export const deployWorker = new Worker(
  "deploy",
  async (job) => {
    const { projectId, env, provider = "mock" } = job.data;
    const deployId = job.id.toString();
    const start = Date.now();

    console.log(`🚀 [Deploy Worker] Job reçu: ${projectId} (${env})`);

    try {
      // ➡️ Mise à jour du statut : RUNNING
      await prisma.deployment.update({
        where: { id: deployId },
        data: { status: "RUNNING", startedAt: new Date() },
      });

      // ➡️ Log initial
      await prisma.deployLog.create({
        data: {
          deploymentId: deployId,
          level: "info",
          message: `Déploiement démarré pour ${projectId} (${env}) via ${provider}`,
        },
      });

      // 🔧 Simulation logique de déploiement
      // Ici tu pourrais appeler Netlify API, Docker, Vercel, AWS, etc.
      if (provider === "mock") {
        await new Promise((r) => setTimeout(r, 5000));
      }

      // ➡️ Déploiement terminé avec succès
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

      // ➡️ Audit log
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

      throw err; // ⬅️ Permet au worker de gérer le retry/backoff
    } finally {
      const latency = Date.now() - start;
      console.log(
        `⏱️ [Deploy Worker] Job ${deployId} terminé en ${latency}ms`
      );
    }
  },
  {
    connection: queues.deploy.opts.connection,
    concurrency: 3, // 3 déploiements en parallèle max
    lockDuration: DEPLOY_TIMEOUT_MS,
    removeOnComplete: { count: 50 }, // garde historique limité
    removeOnFail: { count: 100 }, // logs échecs
  }
);
