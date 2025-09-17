// src/controllers/webhookController.ts
import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import fetch from "node-fetch";
import crypto from "crypto";
import { z } from "zod";

/* ============================================================================
 *  🌐 Webhooks Controller enrichi
 * ========================================================================== */

const CreateWebhookSchema = z.object({
  url: z.string().url(),
  event: z.string().min(1),
  secret: z.string().optional(),
});

function ensureAuth(req: Request) {
  const u = (req as any).user;
  if (!u?.id) {
    const err: any = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }
  return u;
}

async function audit(userId: string, action: string, metadata: any = {}) {
  try {
    await prisma.auditLog.create({ data: { userId, action, metadata } });
  } catch (err) {
    console.warn("⚠️ auditLog failed", err);
  }
}

/* ============================================================================
 *  CRUD Webhooks
 * ========================================================================== */

// ✅ Créer un webhook
export async function createWebhook(req: Request, res: Response) {
  try {
    const user = ensureAuth(req);
    const { url, event, secret } = CreateWebhookSchema.parse(req.body);

    const webhook = await prisma.webhook.create({
      data: { userId: user.id, url, event, secret, active: true },
    });

    await audit(user.id, "WEBHOOK_CREATED", { id: webhook.id, url, event });

    res.status(201).json({ success: true, data: webhook });
  } catch (error: any) {
    console.error("❌ createWebhook:", error);
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
}

// ✅ Lister mes webhooks
export async function listWebhooks(req: Request, res: Response) {
  try {
    const user = ensureAuth(req);

    const webhooks = await prisma.webhook.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        deliveries: { orderBy: { createdAt: "desc" }, take: 3 },
      },
    });

    res.json({ success: true, data: webhooks });
  } catch (error) {
    console.error("❌ listWebhooks:", error);
    res.status(500).json({ success: false, message: "Erreur listing webhooks" });
  }
}

// ✅ Supprimer un webhook
export async function deleteWebhook(req: Request, res: Response) {
  try {
    const user = ensureAuth(req);
    const { id } = req.params;

    const webhook = await prisma.webhook.findUnique({ where: { id } });
    if (!webhook || webhook.userId !== user.id) {
      return res.status(404).json({ success: false, message: "Webhook introuvable" });
    }

    await prisma.webhook.delete({ where: { id } });
    await audit(user.id, "WEBHOOK_DELETED", { id });

    res.json({ success: true, message: "Webhook supprimé" });
  } catch (error) {
    console.error("❌ deleteWebhook:", error);
    res.status(500).json({ success: false, message: "Erreur suppression webhook" });
  }
}

// ✅ Activer / désactiver un webhook
export async function toggleWebhook(req: Request, res: Response) {
  try {
    const user = ensureAuth(req);
    const { id } = req.params;

    const webhook = await prisma.webhook.findUnique({ where: { id } });
    if (!webhook || webhook.userId !== user.id) {
      return res.status(404).json({ success: false, message: "Webhook introuvable" });
    }

    const updated = await prisma.webhook.update({
      where: { id },
      data: { active: !webhook.active },
    });

    await audit(user.id, "WEBHOOK_TOGGLED", { id, active: updated.active });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("❌ toggleWebhook:", error);
    res.status(500).json({ success: false, message: "Erreur toggle webhook" });
  }
}

/* ============================================================================
 *  Deliveries
 * ========================================================================== */

// ✅ Liste des livraisons d’un webhook
export async function listDeliveries(req: Request, res: Response) {
  try {
    const user = ensureAuth(req);
    const { id } = req.params;

    const deliveries = await prisma.webhookDelivery.findMany({
      where: { webhookId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    res.json({ success: true, data: deliveries });
  } catch (err) {
    console.error("❌ listDeliveries error:", err);
    res.status(500).json({ success: false, message: "Erreur récupération livraisons" });
  }
}

// ✅ Rejouer une livraison
export async function replayDelivery(req: Request, res: Response) {
  try {
    const user = ensureAuth(req);
    const { id } = req.params;

    const delivery = await prisma.webhookDelivery.findUnique({
      where: { id },
      include: { webhook: true },
    });
    if (!delivery || delivery.webhook.userId !== user.id) {
      return res.status(404).json({ success: false, message: "Livraison introuvable" });
    }

    await triggerWebhook(delivery.webhook.event, delivery.payload, user.id);

    res.json({ success: true, message: "Livraison rejouée" });
  } catch (err) {
    console.error("❌ replayDelivery error:", err);
    res.status(500).json({ success: false, message: "Erreur replay" });
  }
}

/* ============================================================================
 *  Trigger interne
 * ========================================================================== */
export async function triggerWebhook(event: string, payload: any, userId?: string) {
  const where: any = { active: true, event };
  if (userId) where.userId = userId;

  const webhooks = await prisma.webhook.findMany({ where });

  for (const hook of webhooks) {
    let attempts = 0;
    let success = false;
    let responseText = "";
    let statusCode = 0;
    const start = Date.now();

    while (attempts < 3 && !success) {
      attempts++;
      try {
        let headers: Record<string, string> = {
          "Content-Type": "application/json",
          "X-Webhook-Event": event,
        };
        if (hook.secret) {
          const signature = crypto
            .createHmac("sha256", hook.secret)
            .update(JSON.stringify(payload))
            .digest("hex");
          headers["X-Webhook-Signature"] = signature;
        }

        const res = await fetch(hook.url, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });

        responseText = await res.text();
        statusCode = res.status;
        success = res.ok;
      } catch (err: any) {
        responseText = String(err.message);
      }
    }

    const latency = Date.now() - start;

    await prisma.webhookDelivery.create({
      data: {
        webhookId: hook.id,
        status: success ? "SUCCESS" : "FAILED",
        payload,
        response: responseText.slice(0, 1000),
        httpStatus: statusCode,
        attempts,
        latency,
      },
    });

    if (!success) {
      const failures = await prisma.webhookDelivery.count({
        where: { webhookId: hook.id, status: "FAILED" },
      });
      if (failures >= 5) {
        await prisma.webhook.update({ where: { id: hook.id }, data: { active: false } });
        await audit(hook.userId, "WEBHOOK_AUTO_DISABLED", { id: hook.id });
      }
    }
  }
}
