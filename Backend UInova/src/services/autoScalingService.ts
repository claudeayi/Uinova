import { prisma } from "../utils/prisma";
import { emitEvent } from "./eventBus";

/**
 * Service d’auto-scaling & auto-healing pour les déploiements UInova
 */
export class AutoScalingService {
  /**
   * Vérifie l’état des déploiements et corrige si besoin
   */
  async monitorDeployments() {
    const failed = await prisma.deployment.findMany({
      where: { status: "ERROR" },
      take: 10,
    });

    for (const d of failed) {
      console.warn(`🚨 Déploiement échoué ${d.id} sur projet ${d.projectId}`);
      await this.retryDeployment(d.id);
    }
  }

  /**
   * Relance automatique un déploiement en échec
   */
  async retryDeployment(deploymentId: string) {
    const dep = await prisma.deployment.findUnique({ where: { id: deploymentId } });
    if (!dep) return null;

    // Mise à jour en "PENDING"
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: { status: "PENDING", logs: "Relance automatique..." },
    });

    // ⚡ Ici : tu branches ton vrai service de déploiement
    // Simu : succès après retry
    const updated = await prisma.deployment.update({
      where: { id: deploymentId },
      data: { status: "SUCCESS", logs: "Redéploiement automatique réussi" },
    });

    emitEvent("deployment.retried", { deploymentId });
    return updated;
  }

  /**
   * Rollback si plusieurs échecs consécutifs
   */
  async rollbackDeployment(projectId: string) {
    const last = await prisma.deployment.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });
    if (!last) return null;

    await prisma.deployment.update({
      where: { id: last.id },
      data: { status: "ERROR", logs: (last.logs || "") + "\nRollback automatique déclenché" },
    });

    emitEvent("deployment.rollback", { projectId });
    return last;
  }
}
