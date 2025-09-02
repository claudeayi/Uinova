import { Worker } from "bullmq";
import { queues } from "../utils/queue";
import { prisma } from "../utils/prisma";

new Worker(
  "deploy",
  async (job) => {
    const { projectId, env } = job.data;

    console.log(`🚀 Deploy job reçu: ${projectId} (${env})`);

    await prisma.deployment.update({
      where: { id: job.id as string },
      data: { status: "RUNNING" },
    });

    // 🔧 TODO: logique déploiement (Netlify, Docker, etc.)
    await new Promise((r) => setTimeout(r, 5000));

    await prisma.deployment.update({
      where: { id: job.id as string },
      data: { status: "SUCCESS", targetUrl: `https://${projectId}.${env}.uinova.dev` },
    });

    console.log(`✅ Deploy terminé: ${projectId}`);
  },
  { connection: queues.deploy.opts.connection }
);
