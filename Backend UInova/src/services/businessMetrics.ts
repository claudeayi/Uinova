// src/services/businessMetrics.ts
import client from "prom-client";
import { prisma } from "../utils/prisma";
import { logger } from "../utils/logger";
import { auditLog } from "./auditLogService";
import { emitEvent } from "./eventBus";

/* ============================================================================
 * Gauges Prometheus
 * ============================================================================
 */
const gaugeActiveSubs = new client.Gauge({
  name: "uinova_subscriptions_active_total",
  help: "Nombre d'abonnements actifs",
  labelNames: ["plan"],
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
  labelNames: ["provider"],
});

const gaugePaymentsFailed = new client.Gauge({
  name: "uinova_payments_failed_total",
  help: "Nombre de paiements échoués",
  labelNames: ["provider"],
});

const gaugeRevenueTotal = new client.Gauge({
  name: "uinova_revenue_total",
  help: "Revenus totaux (toutes périodes)",
  labelNames: ["currency"],
});

const gaugeRevenueMonthly = new client.Gauge({
  name: "uinova_revenue_monthly",
  help: "Revenus du mois en cours",
  labelNames: ["currency"],
});

/* ============================================================================
 * Nouveaux KPIs SaaS
 * ============================================================================
 */
const gaugeMRR = new client.Gauge({
  name: "uinova_mrr",
  help: "Monthly Recurring Revenue (MRR)",
  labelNames: ["currency"],
});

const gaugeARPU = new client.Gauge({
  name: "uinova_arpu",
  help: "Average Revenue Per User (ARPU)",
  labelNames: ["currency"],
});

const gaugeChurnRate = new client.Gauge({
  name: "uinova_churn_rate",
  help: "Churn rate (%) basé sur les annulations d’abonnements",
});

const gaugeLTV = new client.Gauge({
  name: "uinova_ltv",
  help: "Lifetime Value estimée des clients (LTV)",
  labelNames: ["currency"],
});

/* ============================================================================
 * Collecteur principal
 * ============================================================================
 */
export async function collectBusinessMetrics(userId: string = "system") {
  try {
    const sinceMonth = new Date();
    sinceMonth.setDate(1);

    // Requêtes principales
    const [
      activeSubs,
      trialSubs,
      canceledSubs,
      paymentsSuccess,
      paymentsFailed,
      revenueAll,
      revenueMonth,
      subsByPlan,
      usersCount,
    ] = await Promise.all([
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
      prisma.subscription.count({ where: { status: "TRIAL" } }),
      prisma.subscription.count({ where: { status: "CANCELED" } }),
      prisma.payment.groupBy({
        by: ["provider"],
        where: { status: "SUCCEEDED" },
        _count: { _all: true },
      }),
      prisma.payment.groupBy({
        by: ["provider"],
        where: { status: "FAILED" },
        _count: { _all: true },
      }),
      prisma.payment.groupBy({
        by: ["currency"],
        where: { status: "SUCCEEDED" },
        _sum: { amount: true },
      }),
      prisma.payment.groupBy({
        by: ["currency"],
        where: { status: "SUCCEEDED", createdAt: { gte: sinceMonth } },
        _sum: { amount: true },
      }),
      prisma.subscription.groupBy({
        by: ["plan"],
        where: { status: "ACTIVE" },
        _count: { _all: true },
      }),
      prisma.user.count(),
    ]);

    /* ============================================================================
     * Mise à jour des métriques de base
     * ============================================================================
     */
    gaugeActiveSubs.set(activeSubs);
    gaugeTrialSubs.set(trialSubs);
    gaugeCanceledSubs.set(canceledSubs);

    subsByPlan.forEach((s) => {
      gaugeActiveSubs.set({ plan: s.plan || "unknown" }, s._count._all);
    });

    paymentsSuccess.forEach((p) =>
      gaugePaymentsSucceeded.set({ provider: p.provider || "unknown" }, p._count._all)
    );
    paymentsFailed.forEach((p) =>
      gaugePaymentsFailed.set({ provider: p.provider || "unknown" }, p._count._all)
    );

    revenueAll.forEach((r) =>
      gaugeRevenueTotal.set({ currency: r.currency || "USD" }, r._sum.amount || 0)
    );
    revenueMonth.forEach((r) =>
      gaugeRevenueMonthly.set({ currency: r.currency || "USD" }, r._sum.amount || 0)
    );

    /* ============================================================================
     * Calculs avancés (KPI SaaS)
     * ============================================================================
     */
    const monthlyRevenue = revenueMonth.reduce(
      (sum, r) => sum + (r._sum.amount || 0),
      0
    );
    const totalRevenue = revenueAll.reduce(
      (sum, r) => sum + (r._sum.amount || 0),
      0
    );

    const mrr = monthlyRevenue; // simplifié : revenus mensuels récurrents
    const arpu = usersCount > 0 ? monthlyRevenue / usersCount : 0;
    const churnRate =
      activeSubs + canceledSubs > 0
        ? (canceledSubs / (activeSubs + canceledSubs)) * 100
        : 0;
    const ltv = arpu * 12 * 3; // hypothèse : rétention moyenne de 3 ans

    gaugeMRR.set({ currency: "USD" }, mrr);
    gaugeARPU.set({ currency: "USD" }, arpu);
    gaugeChurnRate.set(churnRate);
    gaugeLTV.set({ currency: "USD" }, ltv);

    /* ============================================================================
     * Audit & EventBus
     * ============================================================================
     */
    await auditLog.log(userId, "BUSINESS_METRICS_COLLECTED", {
      activeSubs,
      trialSubs,
      canceledSubs,
      mrr,
      arpu,
      churnRate,
      ltv,
    });

    emitEvent("metrics.business.collected", {
      activeSubs,
      trialSubs,
      canceledSubs,
      mrr,
      arpu,
      churnRate,
      ltv,
      at: new Date(),
    });

    logger.info("📊 Business metrics updated (Prometheus + SaaS KPIs)");
  } catch (err: any) {
    logger.error("❌ collectBusinessMetrics error:", err?.message);
    await auditLog.log(userId, "BUSINESS_METRICS_ERROR", { error: err?.message });
    emitEvent("metrics.business.error", { error: err?.message });
  }
}
