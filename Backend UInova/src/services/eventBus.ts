import { EventEmitter } from "events";
import axios from "axios";
import crypto from "crypto";
import { prisma } from "../utils/prisma";

const bus = new EventEmitter();

/* ============================================================================
 *  EMISSION & ABONNEMENT INTERNE
 * ========================================================================== */
export function emitEvent(event: string, payload: any) {
  // ⚡ Emission non bloquante
  setImmediate(() => bus.emit(event, payload));
}

export function onEvent(event: string, handler: (data: any) => void) {
  bus.on(event, handler);
}

/* ============================================================================
 *  WEBHOOKS – CRUD
 * ========================================================================== */
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
 * ========================================================================== */
function signPayload(payload: any, secret: string) {
  return crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("hex");
}

/* ============================================================================
 *  DISPATCH AUTOMATIQUE VERS WEBHOOKS
 * ========================================================================== */
async function dispatchEvent(event: string, data: any) {
  const hooks = await prisma.webhook.findMany({
    where: { event, active: true },
  });

  for (const hook of hooks) {
    // HMAC avec clé secrète par webhook (ou fallback env)
    const secret = hook.secret || process.env.WEBHOOK_SECRET || "uinova-secret";
    const signature = signPayload({ event, data }, secret);

    // Envoi + retry exponentiel
    const attemptDelivery = async (retry = 0): Promise<void> => {
      const start = Date.now();
      try {
        const res = await axios.post(
          hook.url,
          { event, data, signature },
          { timeout: 5000, headers: { "X-UInova-Signature": signature } }
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
      } catch (err: any) {
        console.error(`❌ Webhook error [${hook.url}] (${err.message})`);

        await prisma.webhookDelivery.create({
          data: {
            webhookId: hook.id,
            status: "FAILED",
            payload: data,
            response: String(err.message).slice(0, 500),
            latencyMs: Date.now() - start,
          },
        });

        // 🔁 Retry exponentiel max 3 fois
        if (retry < 3) {
          const delay = Math.pow(2, retry) * 5000; // 5s → 10s → 20s
          console.log(`🔁 Retry #${retry + 1} dans ${delay / 1000}s`);
          setTimeout(() => attemptDelivery(retry + 1), delay);
        }
      }
    };

    attemptDelivery();
  }
}

/* ============================================================================
 *  ABONNEMENTS PAR DEFAUT
 * ========================================================================== */
const SUPPORTED_EVENTS = [
  "project.published",
  "export.done",
  "deployment.done",
  "payment.succeeded",
  "notification.created",
];

for (const ev of SUPPORTED_EVENTS) {
  bus.on(ev, async (payload) => {
    await dispatchEvent(ev, payload);
  });
}
