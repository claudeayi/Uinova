import client from "prom-client";
import { prisma } from "../utils/prisma";

/**
 * Collecte des métriques Prometheus pour les déploiements UInova
 */
export async function collectDeploymentMetrics() {
  // ✅ Gauges par statut
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

  // ✅ Compteur global
  const gaugeTotal = new client.Gauge({
    name: "uinova_deployments_total",
    help: "Nombre total de déploiements enregistrés",
  });

  // ✅ Histogramme pour les durées
  const histogramDuration = new client.Histogram({
    name: "uinova_deployments_duration_seconds",
    help: "Durée des déploiements en secondes",
    buckets: [5, 10, 30, 60, 120, 300, 600], // granularité
  });

  // Récupération DB
  const [success, error, pending, running, canceled, total, completed] =
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
        take: 50, // dernier batch pour calculer durée moyenne
        orderBy: { createdAt: "desc" },
      }),
    ]);

  // Affecter valeurs
  gaugeSuccess.set(success);
  gaugeError.set(error);
  gaugePending.set(pending);
  gaugeRunning.set(running);
  gaugeCanceled.set(canceled);
  gaugeTotal.set(total);

  // Histogramme (durée)
  for (const d of completed) {
    if (d.createdAt && d.updatedAt) {
      const duration = (d.updatedAt.getTime() - d.createdAt.getTime()) / 1000;
      if (duration > 0) histogramDuration.observe(duration);
    }
  }

  console.log("📊 Deployment metrics collected", {
    success,
    error,
    pending,
    running,
    canceled,
    total,
  });
}
