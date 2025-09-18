// src/workers/emailWorker.ts
import { Worker } from "bullmq";
import { queues } from "../utils/queue";
import { sendEmail } from "../utils/mailer";
import { prisma } from "../utils/prisma";

const EMAIL_TIMEOUT_MS = 1000 * 60 * 2; // 2 min max

/* ============================================================================
 *  EMAIL WORKER – gestion des envois transactionnels & newsletters
 * ========================================================================== */
export const emailWorker = new Worker(
  "email",
  async (job) => {
    const { to, subject, template, data, provider = "default" } = job.data;
    const start = Date.now();

    console.log(`📧 [EmailWorker] Job reçu → ${to} (${subject})`);

    try {
      // Envoi email via utils/mailer (multi-provider)
      await sendEmail(to, subject, template, data, provider);

      const latency = Date.now() - start;

      // ✅ Log en DB : succès
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

      // ✅ Audit
      await prisma.auditLog.create({
        data: {
          userId: job.data.userId || null,
          action: "EMAIL_SENT",
          metadata: { to, subject, template, provider, latency },
        },
      });

      console.log(`✅ [EmailWorker] Email envoyé → ${to} (${latency}ms)`);
    } catch (err: any) {
      console.error("❌ [EmailWorker] Erreur:", err.message);

      // ❌ Log en DB : échec
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

      // ❌ Audit
      await prisma.auditLog.create({
        data: {
          userId: job.data.userId || null,
          action: "EMAIL_FAILED",
          metadata: { to, subject, template, provider, error: err.message },
        },
      });

      throw err; // ➝ Laisse BullMQ gérer retry/backoff
    }
  },
  {
    connection: queues.email.opts.connection,
    concurrency: Number(process.env.EMAIL_WORKER_CONCURRENCY || 5), // scalable
    lockDuration: EMAIL_TIMEOUT_MS,
    removeOnComplete: { count: 200 }, // garder plus d’historique des succès
    removeOnFail: { count: 500 }, // garder plus d’échecs
  }
);

/* ============================================================================
 *  HOOKS – monitoring avancé
 * ========================================================================== */
emailWorker.on("completed", (job) => {
  console.log(`📬 [EmailWorker] Job ${job.id} complété avec succès`);
});

emailWorker.on("failed", (job, err) => {
  console.error(`❌ [EmailWorker] Job ${job?.id} échoué:`, err?.message);
});

emailWorker.on("stalled", (jobId) => {
  console.warn(`⚠️ [EmailWorker] Job ${jobId} stalled (bloqué)`);
});

emailWorker.on("progress", (job, progress) => {
  console.log(`⏳ [EmailWorker] Job ${job.id} progression: ${progress}%`);
});
