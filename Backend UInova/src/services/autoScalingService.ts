// src/services/autoScalingService.ts
import { prisma } from "../utils/prisma";
import { emitEvent } from "./eventBus";
import { logger } from "../utils/logger";

export class AutoScalingService {
  private MAX_RETRIES = parseInt(process.env.DEPLOY_MAX_RETRIES || "3", 10);

  /**
   * Vérifie l’état des déploiements et tente des corrections
   */
  async monitorDeployments() {
    logger.info("🔍 Monitoring des déploiements...");

    try {
      const failed = await prisma.deployment.findMany({
        where: { status: "ERROR" },
        take: 20,
      });

      for (const d of failed) {
        logger.warn(`🚨 Déploiement échoué ${d.id} (projet=${d.projectId})`);
        await this.retryDeployment(d.id);
      }
    } catch (err: any) {
      logger.error("❌ monitorDeployments error:", err?.message);
    }
  }

  /**
   * Relance automatique un déploiement en échec
   */
  async retryDeployment(deploymentId: string) {
    try {
      const dep = await prisma.deployment.findUnique({ where: { id: deploymentId } });
      if (!dep) return null;

      const retries = (dep.retries || 0) + 1;
      if (retries > this.MAX_RETRIES) {
        logger.error(`❌ Trop d’échecs (${retries}), rollback requis pour projet=${dep.projectId}`);
        await this.rollbackDeployment(dep.projectId);
        return null;
      }

      // Passage en "PENDING"
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: {
          status: "PENDING",
          logs: (dep.logs || "") + `\nRelance automatique (${retries}/${this.MAX_RETRIES})...`,
          retries,
        },
      });

      // ⚡ Ici : brancher ton vrai orchestrateur (Kubernetes/Docker/Cloud)
      const updated = await prisma.deployment.update({
        where: { id: deploymentId },
        data: {
          status: "SUCCESS",
          logs: (dep.logs || "") + "\n✅ Redéploiement automatique réussi",
        },
      });

      emitEvent("deployment.retry.success", { deploymentId, retries });
      logger.info(`✅ Retry réussi pour déploiement=${deploymentId}`);
      return updated;
    } catch (err: any) {
      logger.error("❌ retryDeployment error:", err?.message);
      emitEvent("deployment.retry.failed", { deploymentId, error: err?.message });
      return null;
    }
  }

  /**
   * Rollback si plusieurs échecs consécutifs
   */
  async rollbackDeployment(projectId: string) {
    try {
      const last = await prisma.deployment.findFirst({
        where: { projectId },
        orderBy: { createdAt: "desc" },
      });
      if (!last) return null;

      await prisma.deployment.update({
        where: { id: last.id },
        data: {
          status: "ERROR",
          logs: (last.logs || "") + "\n⚠️ Rollback automatique déclenché",
        },
      });

      emitEvent("deployment.rollback.triggered", { projectId, deploymentId: last.id });
      logger.warn(`↩️ Rollback déclenché pour projet=${projectId}`);
      return last;
    } catch (err: any) {
      logger.error("❌ rollbackDeployment error:", err?.message);
      return null;
    }
  }
}
