import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import fetch from "node-fetch";
import crypto from "crypto";

/* ============================================================================
 *  🌐 Webhooks Controller
 *  - CRUD complet (create/list/delete/toggle)
 *  - Déclenchement fiable avec retries
 *  - Tracking des livraisons (status, latence, réponse)
 *  - Sécurité : signature HMAC optionnelle
 * ========================================================================== */

/**
 * ✅ Créer un webhook
 */
export async function createWebhook(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const { url, event, secret } = req.body;

    if (!user?.id) return res.status(401).json({ success: false, message: "Non autorisé" });
    if (!url || !/^https?:\/\/.+/.test(url)) {
      return res.status(400).json({ success: false, message: "URL invalide" });
    }
    if (!event) {
      return res.status(400).json({ success: false, message: "Événement requis" });
    }

    const webhook = await prisma.webhook.create({
      data: { userId: user.id, url, event, secret, active: true },
    });

    res.status(201).json({ success: true, data: webhook });
  } catch (error) {
    console.error("❌ createWebhook:", error);
    res.status(500).json({ success: false, message: "Erreur lors de la création du webhook" });
  }
}

/**
 * ✅ Lister mes webhooks
 */
export async function listWebhooks(req: Request, res: Response) {
  try {
    const user = (req as any).user;

    const webhooks = await prisma.webhook.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: webhooks });
  } catch (error) {
    console.error("❌ listWebhooks:", error);
    res.status(500).json({ success: false, message: "Erreur lors du listing" });
  }
}

/**
 * ✅ Supprimer un webhook
 */
export async function deleteWebhook(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const webhook = await prisma.webhook.findUnique({ where: { id } });
    if (!webhook || webhook.userId !== user.id) {
      return res.status(404).json({ success: false, message: "Webhook introuvable" });
    }

    await prisma.webhook.delete({ where: { id } });
    res.json({ success: true, message: "Webhook supprimé" });
  } catch (error) {
    console.error("❌ deleteWebhook:", error);
    res.status(500).json({ success: false, message: "Erreur lors de la suppression" });
  }
}

/**
 * ✅ Activer / désactiver un webhook
 */
export async function toggleWebhook(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const webhook = await prisma.webhook.findUnique({ where: { id } });
    if (!webhook || webhook.userId !== user.id) {
      return res.status(404).json({ success: false, message: "Webhook introuvable" });
    }

    const updated = await prisma.webhook.update({
      where: { id },
      data: { active: !webhook.active },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("❌ toggleWebhook:", error);
    res.status(500).json({ success: false, message: "Erreur lors du changement d'état" });
  }
}

/**
 * ✅ Déclencher un webhook (service interne)
 * - Support retries
 * - Signature HMAC si secret fourni
 */
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
        // Signature HMAC si secret existe
        let headers: Record<string, string> = { "Content-Type": "application/json" };
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
        success = false;
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
  }
}
