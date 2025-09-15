// src/services/businessMetrics.ts
import client from "prom-client";
import { prisma } from "../utils/prisma";
import { logger } from "../utils/logger";

/**
 * Collecte des métriques business UInova
 * ⚡ Observabilité Prometheus pour SaaS : abonnements, paiements, revenus
 */
export async function collectBusinessMetrics() {
  // Abonnements
  const gaugeActiveSubs = new client.Gauge({
    name: "uinova_subscriptions_active_total",
    help: "Nombre d'abonnements actifs",
  });
  const gaugeTrialSubs = new client.Gauge({
    name: "uinova_subscriptions_trial_total",
    help: "Nombre d'abonnements en essai",
  });
  const gaugeCanceledSubs = new client.Gauge({
    name: "uinova_subscriptions_canceled_total",
    help: "Nombre d'abonnements annulés",
  });

  // Paiements
  const gaugePaymentsSucceeded = new client.Gauge({
    name: "uinova_payments_succeeded_total",
    help: "Nombre de paiements réussis",
  });
  const gaugePaymentsFailed = new client.Gauge({
    name: "uinova_payments_failed_total",
    help: "Nombre de paiements échoués",
  });

  // Revenus (somme totale en $ ou €)
  const gaugeRevenueTotal = new client.Gauge({
    name: "uinova_revenue_total",
    help: "Revenus totaux (toutes périodes)",
  });

  // Revenus du mois en cours
  const gaugeRevenueMonthly = new client.Gauge({
    name: "uinova_revenue_monthly",
    help: "Revenus du mois en cours",
  });

  try {
    const sinceMonth = new Date();
    sinceMonth.setDate(1);

    const [active, trial, canceled, paymentsSuccess, paymentsFailed, revenueAll, revenueMonth] =
      await Promise.all([
        prisma.subscription.count({ where: { status: "ACTIVE" } }),
        prisma.subscription.count({ where: { status: "TRIAL" } }),
        prisma.subscription.count({ where: { status: "CANCELED" } }),
        prisma.payment.count({ where: { status: "SUCCEEDED" } }),
        prisma.payment.count({ where: { status: "FAILED" } }),
        prisma.payment.aggregate({
          _sum: { amount: true },
          where: { status: "SUCCEEDED" },
        }),
        prisma.payment.aggregate({
          _sum: { amount: true },
          where: { status: "SUCCEEDED", createdAt: { gte: sinceMonth } },
        }),
      ]);

    // Mise à jour des métriques
    gaugeActiveSubs.set(active);
    gaugeTrialSubs.set(trial);
    gaugeCanceledSubs.set(canceled);
    gaugePaymentsSucceeded.set(paymentsSuccess);
    gaugePaymentsFailed.set(paymentsFailed);
    gaugeRevenueTotal.set(revenueAll._sum.amount || 0);
    gaugeRevenueMonthly.set(revenueMonth._sum.amount || 0);

    logger.info("📊 Business metrics updated (Prometheus)");
  } catch (err: any) {
    logger.error("❌ collectBusinessMetrics error:", err?.message);
  }
}
