import { Worker } from "bullmq";
import { queues } from "../utils/queue";
import { prisma } from "../utils/prisma";

new Worker(
  "export",
  async (job) => {
    const { projectId, target } = job.data;

    console.log(`📦 Export job reçu: ${projectId} → ${target}`);

    await prisma.exportJob.update({
      where: { id: job.id as string },
      data: { status: "RUNNING" },
    });

    // 🔧 TODO: logique réelle d’export (HTML/Flutter)
    await new Promise((r) => setTimeout(r, 2000));

    await prisma.exportJob.update({
      where: { id: job.id as string },
      data: { status: "DONE", resultUrl: `/exports/${projectId}-${Date.now()}.zip` },
    });

    console.log(`✅ Export terminé: ${projectId}`);
  },
  { connection: queues.export.opts.connection }
);
