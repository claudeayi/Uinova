import { createWorker } from "../utils/redis";
import { prisma } from "../utils/prisma";

export const exportWorker = createWorker("export", async (job) => {
  console.log("📦 Export job reçu:", job.id, job.data);

  const { projectId, target } = job.data;

  // ⚡ Ici tu ajoutes ton vrai service exportService
  // Simu : création d’un fichier
  await prisma.exportJob.update({
    where: { id: job.data.exportId },
    data: {
      status: "DONE",
      resultUrl: `/exports/${projectId}-${target}.zip`,
    },
  });

  return { success: true };
});
