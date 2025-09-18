// src/services/eventBus.ts
import { EventEmitter } from "events";
import axios from "axios";
import crypto from "crypto";
import { prisma } from "../utils/prisma";
import { auditLog } from "./auditLogService";
import { logger } from "../utils/logger";
import client from "prom-client";
import { z } from "zod";

const bus = new EventEmitter();

/* ============================================================================
 * 📊 Metrics Prometheus
 * ============================================================================
 */
const counterEvents = new client.Counter({
  name: "uinova_events_total",
  help: "Nombre total d’événements émis",
  labelNames: ["event"],
});

const counterWebhookDeliveries = new client.Counter({
  name: "uinova_webhook_deliveries_total",
  help: "Nombre total de livraisons webhook",
  labelNames: ["event", "status"],
});

const histogramWebhookLatency = new client.Histogram({
  name: "uinova_webhook_latency_ms",
  help: "Latence des appels webhook (ms)",
  labelNames: ["event"],
  buckets: [50, 100, 200, 500, 1000, 2000, 5000],
});

/* ============================================================================
 *  EMISSION & ABONNEMENT INTERNE
 * ============================================================================
 */
export function emitEvent(event: string, payload: any) {
  setImmediate(() => bus.emit(event, payload));
  counterEvents.inc({ event });
  auditLog.log("system", "EVENT_EMITTED", { event, payload }).catch(() => {});
  logger.info(`📡 Event emitted: ${event}`);
}

export function onEvent(event: string, handler: (data: any) => void) {
  bus.on(event, handler);
}

/* ============================================================================
 *  WEBHOOKS – CRUD
 * ============================================================================
 */
export async function registerWebhook(userId: string, url: string, event: string) {
  return prisma.webhook.create({ data: { userId, url, event, active: true } });
}

export async function listWebhooks(userId: string) {
  return prisma.webhook.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function removeWebhook(userId: string, id: string) {
  const hook = await prisma.webhook.findUnique({ where: { id } });
  if (!hook || hook.userId !== userId) return null;
  await prisma.webhook.delete({ where: { id } });
  return hook;
}

/* ============================================================================
 *  SIGNATURE HMAC (sécurité)
 * ============================================================================
 */
function signPayload(payload: any, secret: string) {
  return crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("hex");
}

/* ============================================================================
 *  DISPATCH AUTOMATIQUE VERS WEBHOOKS
 * ============================================================================
 */
async function dispatchEvent(event: string, data: any) {
  const hooks = await prisma.webhook.findMany({
    where: { event, active: true },
  });

  for (const hook of hooks) {
    const secret = hook.secret || process.env.WEBHOOK_SECRET || "uinova-secret";
    const payload = { event, data };
    const signature = signPayload(payload, secret);

    const attemptDelivery = async (retry = 0): Promise<void> => {
      const start = Date.now();
      try {
        const res = await axios.post(
          hook.url,
          payload,
          {
            timeout: 5000,
            headers: {
              "X-UInova-Event": event,
              "X-UInova-Signature": signature,
            },
          }
        );

        await prisma.webhookDelivery.create({
          data: {
            webhookId: hook.id,
            status: res.status >= 200 && res.status < 300 ? "SUCCESS" : "FAILED",
            payload: data,
            response: res.statusText,
            latencyMs: Date.now() - start,
          },
        });

        counterWebhookDeliveries.inc({ event, status: "success" });
        histogramWebhookLatency.observe({ event }, Date.now() - start);

        logger.info(`✅ Webhook delivered [${event}] → ${hook.url}`);
      } catch (err: any) {
        await prisma.webhookDelivery.create({
          data: {
            webhookId: hook.id,
            status: "FAILED",
            payload: data,
            response: String(err.message).slice(0, 500),
            latencyMs: Date.now() - start,
          },
        });

        counterWebhookDeliveries.inc({ event, status: "failed" });
        histogramWebhookLatency.observe({ event }, Date.now() - start);

        logger.error(`❌ Webhook failed [${event}] → ${hook.url}`, err.message);

        if (retry < 3) {
          const delay = Math.pow(2, retry) * 5000; // 5s → 10s → 20s
          logger.warn(`🔁 Retry #${retry + 1} in ${delay / 1000}s for ${hook.url}`);
          setTimeout(() => attemptDelivery(retry + 1), delay);
        }
      }
    };

    attemptDelivery();
  }
}

/* ============================================================================
 *  ABONNEMENTS PAR DÉFAUT
 * ============================================================================
 */
export const SUPPORTED_EVENTS = [
  "project.published",
  "export.done",
  "deployment.done",
  "payment.succeeded",
  "notification.created",
  "email.sent",
  "email.failed",
];

for (const ev of SUPPORTED_EVENTS) {
  bus.on(ev, async (payload) => {
    await dispatchEvent(ev, payload);
  });
}
