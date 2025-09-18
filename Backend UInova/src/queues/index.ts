// src/jobs/queues.ts
import { createQueue } from "../utils/redis";
import { Queue } from "bullmq";
import ms from "ms";

/* ============================================================================
 *  UInova Job Queues – centralisation enrichie
 * ========================================================================== */
function queueDefaults(name: string, overrides: any = {}): Queue {
  return createQueue(name, {
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: { count: 500 },
      removeOnFail: { count: 1000 },
      ...overrides,
    },
    limiter: {
      max: Number(process.env[`QUEUE_${name.toUpperCase()}_RATE`] || 50),
      duration: 1000, // par seconde
    },
  });
}

// Emailing (transactionnel + newsletters)
export const emailQueue = queueDefaults("email", {
  attempts: 5,
  backoff: { type: "exponential", delay: 3000 },
});

// Exports (HTML, Flutter, React…)
export const exportQueue = queueDefaults("export", {
  attempts: 2,
  backoff: { type: "fixed", delay: 5000 },
});

// Déploiements (Docker, Netlify, Vercel…)
export const deployQueue = queueDefaults("deploy", {
  attempts: 4,
  backoff: { type: "exponential", delay: 3000 },
});

// Billing (facturation, paiements, réconciliations)
export const billingQueue = queueDefaults("billing", {
  attempts: 5,
  backoff: { type: "exponential", delay: 2000 },
  ttl: ms("10m"), // expire si pas traité
});

// Webhooks (notifications externes, intégrations)
export const webhookQueue = queueDefaults("webhook", {
  attempts: 5,
  backoff: { type: "exponential", delay: 10000 },
});

// IA (Copilot, génération UI, optimisation UX)
export const aiQueue = queueDefaults("ai", {
  attempts: 2,
  backoff: { type: "fixed", delay: 4000 },
});

// Notifications (push, email, in-app)
export const notificationQueue = queueDefaults("notification");

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

  return Promise.all(
    queues.map(async (q) => {
      const [waiting, active, completed, failed, delayed, isPaused] =
        await Promise.all([
          q.getWaitingCount(),
          q.getActiveCount(),
          q.getCompletedCount(),
          q.getFailedCount(),
          q.getDelayedCount(),
          q.isPaused(),
        ]);

      return {
        name: q.name,
        waiting,
        active,
        completed,
        failed,
        delayed,
        paused: isPaused,
        successRate:
          completed + failed > 0
            ? Number(((completed / (completed + failed)) * 100).toFixed(2))
            : 100,
      };
    })
  );
}

/* ============================================================================
 *  Gestion globale – maintenance
 * ========================================================================== */
export async function pauseAllQueues() {
  const queues = [
    emailQueue,
    exportQueue,
    deployQueue,
    billingQueue,
    webhookQueue,
    aiQueue,
    notificationQueue,
  ];
  await Promise.all(queues.map((q) => q.pause()));
  console.log("⏸️ Toutes les queues sont en pause");
}

export async function resumeAllQueues() {
  const queues = [
    emailQueue,
    exportQueue,
    deployQueue,
    billingQueue,
    webhookQueue,
    aiQueue,
    notificationQueue,
  ];
  await Promise.all(queues.map((q) => q.resume()));
  console.log("▶️ Toutes les queues ont repris");
}

export async function drainAllQueues() {
  const queues = [
    emailQueue,
    exportQueue,
    deployQueue,
    billingQueue,
    webhookQueue,
    aiQueue,
    notificationQueue,
  ];
  await Promise.all(queues.map((q) => q.drain()));
  console.log("🧹 Toutes les queues vidées");
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
