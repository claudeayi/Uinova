import client from "prom-client";
import { prisma } from "../utils/prisma";

export async function collectBusinessMetrics() {
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

  const gaugePaymentsSucceeded = new client.Gauge({
    name: "uinova_payments_succeeded_total",
    help: "Nombre de paiements réussis",
  });

  const [active, trial, canceled, payments] = await Promise.all([
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.subscription.count({ where: { status: "TRIAL" } }),
    prisma.subscription.count({ where: { status: "CANCELED" } }),
    prisma.payment.count({ where: { status: "SUCCEEDED" } }),
  ]);

  gaugeActiveSubs.set(active);
  gaugeTrialSubs.set(trial);
  gaugeCanceledSubs.set(canceled);
  gaugePaymentsSucceeded.set(payments);
}
