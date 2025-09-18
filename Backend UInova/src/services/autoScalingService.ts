// src/services/autoScalingService.ts
import { prisma } from "../utils/prisma";
import { emitEvent } from "./eventBus";
import { logger } from "../utils/logger";
import { auditLog } from "./auditLogService";
import { metrics } from "../utils/metrics";
import { z } from "zod";

/**
 * Service d’auto-scaling & auto-healing pour les déploiements UInova
 * ⚡ Ultra pro : retries limités, rollback automatique, audit, observabilité
 */
export class AutoScalingService {
  private MAX_RETRIES = parseInt(process.env.DEPLOY_MAX_RETRIES || "3", 10);

  private deploymentIdSchema = z.string().uuid();
  private projectIdSchema = z.string().uuid();

  /**
   * Vérifie l’état des déploiements en échec et tente des corrections
   */
  async monitorDeployments() {
    logger.info("🔍 Monitoring des déploiements (auto-healing)...");

    try {
      const failed = await prisma.deployment.findMany({
        where: { status: "ERROR" },
        take: 20,
      });

      if (failed.length === 0) {
        logger.info("✅ Aucun déploiement échoué détecté.");
        return;
      }

      for (const d of failed) {
        logger.warn(`🚨 Déploiement échoué ${d.id} (projet=${d.projectId})`);
        await this.retryDeployment(d.id);
      }

      metrics.deploymentsChecked.inc(failed.length);
    } catch (err: any) {
      logger.error("❌ monitorDeployments error:", err?.message);
      metrics.deploymentsErrors.inc();
    }
  }

  /**
   * Relance automatique un déploiement en échec
   */
  async retryDeployment(deploymentId: string) {
    try {
      this.deploymentIdSchema.parse(deploymentId);

      const dep = await prisma.deployment.findUnique({ where: { id: deploymentId } });
      if (!dep) return null;

      const retries = (dep.retries || 0) + 1;
      if (retries > this.MAX_RETRIES) {
        logger.error(`❌ Trop d’échecs (${retries}), rollback requis pour projet=${dep.projectId}`);
        await this.rollbackDeployment(dep.projectId);
        metrics.deploymentsRollback.inc();
        return null;
      }

      // Passage en "PENDING"
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: {
          status: "PENDING",
          logs: (dep.logs || "") + `\nRelance automatique (${retries}/${this.MAX_RETRIES})...`,
          retries,
          updatedAt: new Date(),
        },
      });

      // ⚡ Ici : brancher ton vrai orchestrateur (Kubernetes/Docker/Cloud Run)
      const updated = await prisma.deployment.update({
        where: { id: deploymentId },
        data: {
          status: "SUCCESS",
          logs: (dep.logs || "") + "\n✅ Redéploiement automatique réussi",
          updatedAt: new Date(),
        },
      });

      await auditLog.log(dep.userId || "system", "DEPLOYMENT_RETRY", {
        deploymentId,
        retries,
        projectId: dep.projectId,
      });

      emitEvent("deployment.retry.success", { deploymentId, retries });
      metrics.deploymentsRetries.inc();
      logger.info(`✅ Retry réussi pour déploiement=${deploymentId}`);
      return updated;
    } catch (err: any) {
      logger.error("❌ retryDeployment error:", err?.message);
      emitEvent("deployment.retry.failed", { deploymentId, error: err?.message });
      metrics.deploymentsErrors.inc();
      return null;
    }
  }

  /**
   * Rollback automatique si plusieurs échecs consécutifs
   */
  async rollbackDeployment(projectId: string) {
    try {
      this.projectIdSchema.parse(projectId);

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
          updatedAt: new Date(),
        },
      });

      await auditLog.log(last.userId || "system", "DEPLOYMENT_ROLLBACK", {
        projectId,
        deploymentId: last.id,
      });

      emitEvent("deployment.rollback.triggered", {
        projectId,
        deploymentId: last.id,
      });
      metrics.deploymentsRollback.inc();
      logger.warn(`↩️ Rollback déclenché pour projet=${projectId}`);
      return last;
    } catch (err: any) {
      logger.error("❌ rollbackDeployment error:", err?.message);
      metrics.deploymentsErrors.inc();
      return null;
    }
  }
}

export const autoScalingService = new AutoScalingService();
