import { Worker } from "bullmq";
import { queues } from "../utils/queue";
import { sendEmail } from "../utils/mailer";
import { prisma } from "../utils/prisma";

new Worker(
  "email",
  async (job) => {
    const { to, subject, template, data } = job.data;

    console.log(`📧 Email job reçu → ${to} (${subject})`);

    try {
      await sendEmail(to, subject, template, data);

      await prisma.auditLog.create({
        data: {
          userId: null,
          action: "EMAIL_SENT",
          metadata: { to, subject, template },
        },
      });

      console.log(`✅ Email envoyé → ${to}`);
    } catch (err: any) {
      console.error("❌ EmailWorker error:", err.message);

      await prisma.auditLog.create({
        data: {
          userId: null,
          action: "EMAIL_FAILED",
          metadata: { to, subject, error: err.message },
        },
      });

      throw err; // ➝ BullMQ retry
    }
  },
  { connection: queues.email.opts.connection }
);
