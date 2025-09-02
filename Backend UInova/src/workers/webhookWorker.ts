import { Worker } from "bullmq";
import axios from "axios";
import { queues } from "../utils/queue";
import { prisma } from "../utils/prisma";

new Worker(
  "webhook",
  async (job) => {
    const { webhookId, event, payload } = job.data;

    const hook = await prisma.webhook.findUnique({ where: { id: webhookId } });
    if (!hook) throw new Error("Webhook introuvable");

    try {
      const res = await axios.post(hook.url, { event, payload }, { timeout: 5000 });

      await prisma.webhookDelivery.create({
        data: {
          webhookId,
          status: "SUCCESS",
          payload,
          response: res.statusText,
        },
      });

      console.log(`📡 Webhook envoyé: ${hook.url}`);
    } catch (err: any) {
      await prisma.webhookDelivery.create({
        data: {
          webhookId,
          status: "FAILED",
          payload,
          response: String(err.message).slice(0, 500),
        },
      });
      throw err; // BullMQ gère le retry
    }
  },
  { connection: queues.webhook.opts.connection }
);
