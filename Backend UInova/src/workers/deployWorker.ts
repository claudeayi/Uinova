import { createWorker } from "../utils/redis";
import { prisma } from "../utils/prisma";

export const deployWorker = createWorker("deploy", async (job) => {
  console.log("🚀 Deploy job:", job.id, job.data);

  const { projectId } = job.data;

  // ⚡ Ton vrai deployService ici
  await prisma.deployment.update({
    where: { id: job.data.deploymentId },
    data: {
      status: "SUCCESS",
      targetUrl: `https://${projectId}.uinova.dev`,
    },
  });

  return { success: true };
});
