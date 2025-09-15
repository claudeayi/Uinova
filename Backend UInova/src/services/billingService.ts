// src/services/billingService.ts
import { prisma } from "../utils/prisma";
import { logger } from "../utils/logger";
import { emitEvent } from "./eventBus";

export type UsageType = "api_call" | "ai_tokens" | "export_job" | "storage";

export class BillingService {
  /* ============================================================================
   * MÉTRIQUES EN LIVE (données dérivées directement des autres tables)
   * ========================================================================== */
  async trackApiUsage(userId: string) {
    return prisma.auditLog.count({ where: { userId } });
  }

  async trackProjects(userId: string) {
    return prisma.project.count({ where: { ownerId: userId } });
  }

  async trackStorage(userId: string) {
    const uploads = await prisma.upload.aggregate({
      where: { userId },
      _sum: { size: true },
    });
    return uploads._sum.size || 0;
  }

  /* ============================================================================
   * ENREGISTREMENT D’USAGE
   * ========================================================================== */
  async recordUsage(
    userId: string,
    type: UsageType,
    amount: number,
    projectId?: string,
    meta: Record<string, any> = {}
  ) {
    logger.info(`💳 Record usage: user=${userId}, type=${type}, amount=${amount}`);
    const record = await prisma.usageRecord.create({
      data: { userId, projectId, type, amount, meta },
    });

    emitEvent("billing.usage.recorded", { userId, type, amount, projectId });
    return record;
  }

  /* ============================================================================
   * RAPPORT GLOBAL (UsageRecord + métriques live)
   * ========================================================================== */
  async getUsageReport(userId: string, period: "month" | "week" | "day" = "month") {
    const since = new Date();
    if (period === "week") since.setDate(since.getDate() - 7);
    if (period === "day") since.setHours(0, 0, 0, 0);
    if (period === "month") since.setDate(1);

    const [api, projects, storage, usageRecords] = await Promise.all([
      this.trackApiUsage(userId),
      this.trackProjects(userId),
      this.trackStorage(userId),
      prisma.usageRecord.findMany({
        where: { userId, createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
    ]);

    const summary = usageRecords.reduce((acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + r.amount;
      return acc;
    }, {} as Record<string, number>);

    return {
      live: {
        api,
        projects,
        storageMB: +(storage / (1024 * 1024)).toFixed(2),
        storageGB: +(storage / (1024 * 1024 * 1024)).toFixed(2),
      },
      recorded: {
        summary,
        details: usageRecords,
      },
      period: { from: since, to: new Date() },
    };
  }

  /* ============================================================================
   * QUOTAS & SUBSCRIPTIONS
   * ========================================================================== */
  async checkQuota(userId: string, type: UsageType) {
    const subscription = await prisma.subscription.findFirst({
      where: { userId, status: "ACTIVE" },
    });

    if (!subscription || !subscription.usageLimitJson)
      return { ok: true, limit: null };

    const limit = (subscription.usageLimitJson as any)[type];
    if (!limit) return { ok: true, limit: null };

    const since = new Date();
    since.setDate(1); // début du mois
    const usage = await prisma.usageRecord.aggregate({
      where: { userId, type, createdAt: { gte: since } },
      _sum: { amount: true },
    });

    const total = usage._sum.amount || 0;
    const percent = (total / limit) * 100;

    if (percent >= 80 && percent < 100) {
      logger.warn(`⚠️ Quota bientôt atteint (${percent.toFixed(1)}%) pour ${type}`);
      emitEvent("billing.quota.warning", { userId, type, used: total, limit, percent });
    }

    if (percent >= 100) {
      logger.error(`❌ Quota dépassé pour ${type}`);
      emitEvent("billing.quota.exceeded", { userId, type, used: total, limit });
      return { ok: false, used: total, limit };
    }

    return { ok: true, used: total, limit };
  }

  /* ============================================================================
   * ESTIMATION DE COÛT (préparation facturation)
   * ========================================================================== */
  estimateCost(type: UsageType, amount: number) {
    const pricing: Record<UsageType, number> = {
      api_call: parseFloat(process.env.PRICE_API_CALL || "0.001"), // ex: $0.001 / call
      ai_tokens: parseFloat(process.env.PRICE_AI_TOKENS || "0.00002"), // ex: $0.00002 / token
      export_job: parseFloat(process.env.PRICE_EXPORT_JOB || "0.05"), // ex: $0.05 / export
      storage: parseFloat(process.env.PRICE_STORAGE_MB || "0.0001"), // ex: $0.0001 / MB
    };

    const unitPrice = pricing[type];
    const cost = unitPrice * amount;
    return { type, amount, unitPrice, cost };
  }
}

export const billingService = new BillingService();
