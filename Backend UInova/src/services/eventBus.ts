import { EventEmitter } from "events";
import axios from "axios";
import { prisma } from "../utils/prisma";

const bus = new EventEmitter();

/* ============================================================================
 *  EMISSION & ABONNEMENT INTERNE
 * ========================================================================== */

// ⚡ Émettre un événement global
export function emitEvent(event: string, payload: any) {
  bus.emit(event, payload);
}

// ⚡ S’abonner à un événement (interne)
export function onEvent(event: string, handler: (data: any) => void) {
  bus.on(event, handler);
}

/* ============================================================================
 *  WEBHOOKS – CRUD
 * ========================================================================== */

// ✅ Enregistrer un webhook pour un utilisateur
export async function registerWebhook(userId: string, url: string, event: string) {
  return prisma.webhook.create({
    data: { userId, url, event, active: true },
  });
}

// ✅ Lister les webhooks d’un utilisateur
export async function listWebhooks(userId: string) {
  return prisma.webhook.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

// ✅ Supprimer un webhook
export async function removeWebhook(userId: string, id: string) {
  const hook = await prisma.webhook.findUnique({ where: { id } });
  if (!hook || hook.userId !== userId) return null;
  await prisma.webhook.delete({ where: { id } });
  return hook;
}

/* ============================================================================
 *  DISPATCH AUTOMATIQUE VERS WEBHOOKS
 * ========================================================================== */
async function dispatchEvent(event: string, data: any) {
  const hooks = await prisma.webhook.findMany({
    where: { event, active: true },
  });

  for (const hook of hooks) {
    try {
      const res = await axios.post(hook.url, { event, data }, { timeout: 5000 });

      await prisma.webhookDelivery.create({
        data: {
          webhookId: hook.id,
          status: res.status >= 200 && res.status < 300 ? "SUCCESS" : "FAILED",
          payload: data,
          response: res.statusText,
        },
      });
    } catch (err: any) {
      console.error("❌ Webhook error:", hook.url, err.message);

      await prisma.webhookDelivery.create({
        data: {
          webhookId: hook.id,
          status: "FAILED",
          payload: data,
          response: String(err.message).slice(0, 500),
        },
      });

      // 🔁 Retry simple (1 tentative après 5s)
      setTimeout(async () => {
        try {
          await axios.post(hook.url, { event, data }, { timeout: 5000 });
        } catch (retryErr: any) {
          console.error("❌ Webhook retry failed:", hook.url, retryErr.message);
        }
      }, 5000);
    }
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
