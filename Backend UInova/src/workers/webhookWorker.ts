import { Worker } from "bullmq";
import axios from "axios";
import crypto from "crypto";
import { queues } from "../utils/queue";
import { prisma } from "../utils/prisma";

const WEBHOOK_TIMEOUT = Number(process.env.WEBHOOK_TIMEOUT || 7000); // 7s par défaut
const WEBHOOK_CONCURRENCY = Number(process.env.WEBHOOK_CONCURRENCY || 5);

/* ============================================================================
 * WEBHOOK WORKER – envoi fiable des webhooks avec logs et retries
 * ========================================================================== */
export const webhookWorker = new Worker(
  "webhook",
  async (job) => {
    const { webhookId, event, payload } = job.data;
    const start = Date.now();

    console.log(`📡 [WebhookWorker] Job ${job.id} → webhookId=${webhookId}, event=${event}`);

    // Vérifie que le webhook existe
    const hook = await prisma.webhook.findUnique({ where: { id: webhookId } });
    if (!hook) throw new Error("Webhook introuvable");

    try {
      // ➡️ Signature HMAC si secret fourni
      let headers: Record<string, string> = { "Content-Type": "application/json" };
      if (hook.secret) {
        const signature = crypto
          .createHmac("sha256", hook.secret)
          .update(JSON.stringify(payload))
          .digest("hex");
        headers["X-Webhook-Signature"] = signature;
      }

      // ➡️ Envoi HTTP POST
      const res = await axios.post(
        hook.url,
        { event, payload, ts: Date.now(), jobId: job.id },
        { timeout: WEBHOOK_TIMEOUT, validateStatus: () => true, headers }
      );

      const latency = Date.now() - start;

      // ➡️ Sauvegarde livraison
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
          httpStatus: res.status,
          latency,
        },
      });

      // ➡️ Audit log
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

      console.log(`✅ [WebhookWorker] OK → ${hook.url} (${res.status}, ${latency}ms)`);
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
          httpStatus: 0,
          latency,
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
      throw err; // ➝ BullMQ retry/backoff
    }
  },
  {
    connection: queues.webhook.opts.connection,
    concurrency: WEBHOOK_CONCURRENCY,
    lockDuration: WEBHOOK_TIMEOUT + 2000,
    removeOnComplete: { count: 300 },
    removeOnFail: { count: 1000 },
    settings: {
      backoffStrategies: {
        exponentialWithJitter: (attemptsMade) => {
          const base = Math.pow(2, attemptsMade) * 1000;
          const jitter = Math.floor(Math.random() * 1000);
          return base + jitter; // 1s, 2s, 4s, avec jitter
        },
      },
    },
  }
);

/* ============================================================================
 * HOOKS DE MONITORING
 * ========================================================================== */
webhookWorker.on("completed", (job) => {
  console.log(`📤 [WebhookWorker] Job ${job.id} complété avec succès`);
});

webhookWorker.on("failed", (job, err) => {
  console.error(
    `❌ [WebhookWorker] Job ${job?.id} échoué après ${job?.attemptsMade} tentatives:`,
    err?.message
  );
});

webhookWorker.on("stalled", (jobId) => {
  console.warn(`⚠️ [WebhookWorker] Job ${jobId} stalled (bloqué)`);
});

webhookWorker.on("progress", (job, progress) => {
  console.log(`⏳ [WebhookWorker] Job ${job.id} progression: ${progress}%`);
});
