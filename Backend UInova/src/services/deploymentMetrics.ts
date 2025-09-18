// src/services/deploymentMetrics.ts
import client from "prom-client";
import { prisma } from "../utils/prisma";
import { logger } from "../utils/logger";
import { auditLog } from "./auditLogService";
import { emitEvent } from "./eventBus";

/* ============================================================================
 * 📊 Gauges Prometheus définis une seule fois
 * ============================================================================
 */
const gaugeSuccess = new client.Gauge({
  name: "uinova_deployments_success_total",
  help: "Nombre de déploiements réussis",
});
const gaugeError = new client.Gauge({
  name: "uinova_deployments_error_total",
  help: "Nombre de déploiements échoués",
});
const gaugePending = new client.Gauge({
  name: "uinova_deployments_pending_total",
  help: "Nombre de déploiements en attente",
});
const gaugeRunning = new client.Gauge({
  name: "uinova_deployments_running_total",
  help: "Nombre de déploiements en cours",
});
const gaugeCanceled = new client.Gauge({
  name: "uinova_deployments_canceled_total",
  help: "Nombre de déploiements annulés",
});
const gaugeTotal = new client.Gauge({
  name: "uinova_deployments_total",
  help: "Nombre total de déploiements enregistrés",
});
const gaugeSuccessRate = new client.Gauge({
  name: "uinova_deployments_success_rate",
  help: "Taux de succès des déploiements (%)",
});
const gaugeErrorRate = new client.Gauge({
  name: "uinova_deployments_error_rate",
  help: "Taux d’échec des déploiements (%)",
});
const gaugeRetries = new client.Gauge({
  name: "uinova_deployments_avg_retries",
  help: "Nombre moyen de retries par déploiement",
});
const gaugeAge = new client.Gauge({
  name: "uinova_deployments_avg_age_seconds",
  help: "Âge moyen des déploiements (en secondes)",
});
const histogramDuration = new client.Histogram({
  name: "uinova_deployments_duration_seconds",
  help: "Durée des déploiements en secondes",
  buckets: [5, 10, 30, 60, 120, 300, 600, 1200],
});

/* ============================================================================
 * Collecteur
 * ============================================================================
 */
export async function collectDeploymentMetrics(userId: string = "system") {
  try {
    const [success, error, pending, running, canceled, total, completed, retries] =
      await Promise.all([
        prisma.deployment.count({ where: { status: "SUCCESS" } }),
        prisma.deployment.count({ where: { status: "ERROR" } }),
        prisma.deployment.count({ where: { status: "PENDING" } }),
        prisma.deployment.count({ where: { status: "RUNNING" } }),
        prisma.deployment.count({ where: { status: "CANCELED" } }),
        prisma.deployment.count(),
        prisma.deployment.findMany({
          where: { status: "SUCCESS" },
          select: { createdAt: true, updatedAt: true },
          take: 100,
          orderBy: { createdAt: "desc" },
        }),
        prisma.deployment.aggregate({
          _avg: { retries: true },
        }),
      ]);

    // ✅ Affecter valeurs
    gaugeSuccess.set(success);
    gaugeError.set(error);
    gaugePending.set(pending);
    gaugeRunning.set(running);
    gaugeCanceled.set(canceled);
    gaugeTotal.set(total);

    const successRate = total > 0 ? (success / total) * 100 : 0;
    const errorRate = total > 0 ? (error / total) * 100 : 0;
    gaugeSuccessRate.set(successRate);
    gaugeErrorRate.set(errorRate);

    gaugeRetries.set(retries._avg.retries || 0);

    // ✅ Histogramme (durée)
    let totalAge = 0;
    let countAge = 0;
    for (const d of completed) {
      if (d.createdAt && d.updatedAt) {
        const duration = (d.updatedAt.getTime() - d.createdAt.getTime()) / 1000;
        if (duration > 0) {
          histogramDuration.observe(duration);
          totalAge += duration;
          countAge++;
        }
      }
    }
    if (countAge > 0) gaugeAge.set(totalAge / countAge);

    // 🔎 Logs & Audit
    logger.info("📊 Deployment metrics collected", {
      success,
      error,
      pending,
      running,
      canceled,
      total,
      successRate: successRate.toFixed(1) + "%",
      errorRate: errorRate.toFixed(1) + "%",
      avgRetries: retries._avg.retries || 0,
    });

    await auditLog.log(userId, "DEPLOYMENT_METRICS_COLLECTED", {
      success,
      error,
      pending,
      running,
      canceled,
      total,
      successRate,
      errorRate,
      avgRetries: retries._avg.retries || 0,
    });

    emitEvent("metrics.deployments.collected", {
      success,
      error,
      pending,
      running,
      canceled,
      total,
      successRate,
      errorRate,
      at: new Date(),
    });
  } catch (err: any) {
    logger.error("❌ collectDeploymentMetrics error:", err?.message);
    await auditLog.log(userId, "DEPLOYMENT_METRICS_ERROR", { error: err?.message });
    emitEvent("metrics.deployments.error", { error: err?.message });
  }
}
