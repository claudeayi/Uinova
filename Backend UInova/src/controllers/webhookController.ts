import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import fetch from "node-fetch";

// ✅ Créer un webhook
export async function createWebhook(req: Request, res: Response) {
  const user = (req as any).user;
  const { url, event } = req.body;
  if (!user?.id) return res.status(401).json({ success: false, message: "Non autorisé" });

  const webhook = await prisma.webhook.create({
    data: { userId: user.id, url, event },
  });

  res.status(201).json({ success: true, data: webhook });
}

// ✅ Lister mes webhooks
export async function listWebhooks(req: Request, res: Response) {
  const user = (req as any).user;

  const webhooks = await prisma.webhook.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  res.json({ success: true, data: webhooks });
}

// ✅ Supprimer un webhook
export async function deleteWebhook(req: Request, res: Response) {
  const { id } = req.params;
  const user = (req as any).user;

  const webhook = await prisma.webhook.findUnique({ where: { id } });
  if (!webhook || webhook.userId !== user.id) {
    return res.status(404).json({ success: false, message: "Webhook introuvable" });
  }

  await prisma.webhook.delete({ where: { id } });
  res.json({ success: true, message: "Webhook supprimé" });
}

// ✅ Déclencher un webhook (service interne)
export async function triggerWebhook(event: string, payload: any, userId?: string) {
  const where: any = { active: true, event };
  if (userId) where.userId = userId;

  const webhooks = await prisma.webhook.findMany({ where });

  for (const hook of webhooks) {
    try {
      const res = await fetch(hook.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      await prisma.webhookDelivery.create({
        data: {
          webhookId: hook.id,
          status: res.ok ? "SUCCESS" : "FAILED",
          payload,
          response: text.slice(0, 500),
        },
      });
    } catch (err: any) {
      await prisma.webhookDelivery.create({
        data: {
          webhookId: hook.id,
          status: "FAILED",
          payload,
          response: String(err.message).slice(0, 500),
        },
      });
    }
  }
}
