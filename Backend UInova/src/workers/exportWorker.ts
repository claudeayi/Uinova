import { Worker } from "bullmq";
import { queues } from "../utils/queue";
import { sendEmail } from "../utils/mailer";
import { prisma } from "../utils/prisma";

const EMAIL_TIMEOUT_MS = 1000 * 60 * 2; // 2 min max

export const emailWorker = new Worker(
  "email",
  async (job) => {
    const { to, subject, template, data, provider = "default" } = job.data;
    const start = Date.now();

    console.log(`📧 [EmailWorker] Job reçu → ${to} (${subject})`);

    try {
      // Envoi via utils/mailer (qui peut router selon provider)
      await sendEmail(to, subject, template, data, provider);

      const latency = Date.now() - start;

      // Log en DB : succès
      await prisma.emailLog.create({
        data: {
          to,
          subject,
          template,
          provider,
          status: "SENT",
          latencyMs: latency,
        },
      });

      // Audit
      await prisma.auditLog.create({
        data: {
          userId: null,
          action: "EMAIL_SENT",
          metadata: { to, subject, template, provider, latency },
        },
      });

      console.log(`✅ [EmailWorker] Email envoyé → ${to} (${latency}ms)`);
    } catch (err: any) {
      console.error("❌ [EmailWorker] Erreur:", err.message);

      // Log en DB : échec
      await prisma.emailLog.create({
        data: {
          to,
          subject,
          template,
          provider,
          status: "FAILED",
          error: err.message,
        },
      });

      // Audit
      await prisma.auditLog.create({
        data: {
          userId: null,
          action: "EMAIL_FAILED",
          metadata: { to, subject, template, provider, error: err.message },
        },
      });

      throw err; // ➝ BullMQ retry
    }
  },
  {
    connection: queues.email.opts.connection,
    concurrency: 5, // envoyer jusqu'à 5 emails en parallèle
    lockDuration: EMAIL_TIMEOUT_MS,
    removeOnComplete: { count: 100 }, // garder historique limité
    removeOnFail: { count: 200 }, // garder plus d'échecs
  }
);
