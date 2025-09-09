import { createQueue } from "../utils/redis";
import { Queue } from "bullmq";

/* ============================================================================
 *  UInova Job Queues – centralisation
 * ========================================================================== */

// Emailing (transactionnel + newsletters)
export const emailQueue: Queue = createQueue("email", {
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 1000 },
  },
});

// Exports (HTML, Flutter, React…)
export const exportQueue: Queue = createQueue("export", {
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "fixed", delay: 5000 },
    removeOnComplete: { count: 200 },
  },
});

// Déploiements (Docker, Netlify, Vercel…)
export const deployQueue: Queue = createQueue("deploy", {
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 3000 },
    removeOnComplete: { count: 100 },
  },
});

// Billing (facturation, paiements, réconciliations)
export const billingQueue: Queue = createQueue("billing", {
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: true,
    removeOnFail: { count: 200 },
  },
});

// Webhooks (notifications externes, intégrations)
export const webhookQueue: Queue = createQueue("webhook", {
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 10000 },
    removeOnComplete: { count: 300 },
    removeOnFail: { count: 1000 },
  },
});

// IA (Copilot, génération UI, optimisation UX)
export const aiQueue: Queue = createQueue("ai", {
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "fixed", delay: 4000 },
    removeOnComplete: { count: 100 },
  },
});

// Notifications (push, email, in-app)
export const notificationQueue: Queue = createQueue("notification", {
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { count: 300 },
    removeOnFail: { count: 500 },
  },
});

/* ============================================================================
 *  Monitoring utils – stats pour Grafana / Prometheus
 * ========================================================================== */
export async function getQueueStats() {
  const queues = [
    emailQueue,
    exportQueue,
    deployQueue,
    billingQueue,
    webhookQueue,
    aiQueue,
    notificationQueue,
  ];

  const stats = await Promise.all(
    queues.map(async (q) => {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        q.getWaitingCount(),
        q.getActiveCount(),
        q.getCompletedCount(),
        q.getFailedCount(),
        q.getDelayedCount(),
      ]);

      return {
        name: q.name,
        waiting,
        active,
        completed,
        failed,
        delayed,
      };
    })
  );

  return stats;
}

/* ============================================================================
 *  Log de démarrage (utile en dev & monitoring)
 * ========================================================================== */
console.log("✅ Queues initialisées:", [
  emailQueue.name,
  exportQueue.name,
  deployQueue.name,
  billingQueue.name,
  webhookQueue.name,
  aiQueue.name,
  notificationQueue.name,
]);
