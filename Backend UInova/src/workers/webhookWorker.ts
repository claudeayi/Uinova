import { Worker } from "bullmq";
import axios from "axios";
import { queues } from "../utils/queue";
import { prisma } from "../utils/prisma";

const WEBHOOK_TIMEOUT = 7000; // 7s max

export const webhookWorker = new Worker(
  "webhook",
  async (job) => {
    const { webhookId, event, payload } = job.data;
    const start = Date.now();

    console.log(`📡 [WebhookWorker] Job reçu → webhookId=${webhookId}, event=${event}`);

    // Vérifie que le webhook existe
    const hook = await prisma.webhook.findUnique({ where: { id: webhookId } });
    if (!hook) throw new Error("Webhook introuvable");

    try {
      // Envoi du webhook
      const res = await axios.post(
        hook.url,
        { event, payload, ts: Date.now() },
        { timeout: WEBHOOK_TIMEOUT, validateStatus: () => true }
      );

      const latency = Date.now() - start;

      // Sauvegarde delivery
      await prisma.webhookDelivery.create({
        data: {
          webhookId,
          status: res.status >= 200 && res.status < 300 ? "SUCCESS" : "FAILED",
          payload,
          response: JSON.stringify({
            statusCode: res.status,
            statusText: res.statusText,
            latency,
            body: String(res.data).slice(0, 1000), // tronqué
          }),
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: hook.userId,
          action: "WEBHOOK_DELIVERED",
          metadata: { webhookId, url: hook.url, event, status: res.status, latency },
        },
      });

      if (res.status < 200 || res.status >= 300) {
        throw new Error(`Webhook HTTP ${res.status} ${res.statusText}`);
      }

      console.log(`✅ [WebhookWorker] Webhook OK → ${hook.url} (${res.status})`);
      return { status: res.status, latency };
    } catch (err: any) {
      const latency = Date.now() - start;

      await prisma.webhookDelivery.create({
        data: {
          webhookId,
          status: "FAILED",
          payload,
          response: JSON.stringify({
            error: err.message,
            latency,
          }),
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: hook.userId,
          action: "WEBHOOK_FAILED",
          metadata: { webhookId, url: hook.url, event, error: err.message, latency },
        },
      });

      console.error(`❌ [WebhookWorker] Erreur → ${hook.url}: ${err.message}`);
      throw err; // ➝ BullMQ retry
    }
  },
  {
    connection: queues.webhook.opts.connection,
    concurrency: 5, // 5 webhooks simultanés
    lockDuration: WEBHOOK_TIMEOUT + 2000,
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 500 },
    settings: {
      backoffStrategies: {
        exponential: (attemptsMade) => Math.pow(2, attemptsMade) * 1000, // 1s, 2s, 4s, etc.
      },
    },
  }
);
