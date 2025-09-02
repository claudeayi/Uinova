// src/services/billingService.ts
import { prisma } from "../utils/prisma";

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
    return prisma.usageRecord.create({
      data: { userId, projectId, type, amount, meta },
    });
  }

  /* ============================================================================
   * RAPPORT GLOBAL (UsageRecord + métriques live)
   * ========================================================================== */
  async getUsageReport(userId: string) {
    const [api, projects, storage, usageRecords] = await Promise.all([
      this.trackApiUsage(userId),
      this.trackProjects(userId),
      this.trackStorage(userId),
      prisma.usageRecord.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 100,
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
        storageMB: storage / (1024 * 1024),
      },
      recorded: {
        summary,
        details: usageRecords,
      },
    };
  }

  /* ============================================================================
   * QUOTAS & SUBSCRIPTIONS
   * ========================================================================== */
  async checkQuota(userId: string, type: UsageType) {
    const subscription = await prisma.subscription.findFirst({
      where: { userId, status: "ACTIVE" },
    });

    if (!subscription || !subscription.usageLimitJson) return { ok: true, limit: null };

    const limit = (subscription.usageLimitJson as any)[type];
    if (!limit) return { ok: true, limit: null };

    const since = new Date();
    since.setDate(1); // début du mois
    const usage = await prisma.usageRecord.aggregate({
      where: { userId, type, createdAt: { gte: since } },
      _sum: { amount: true },
    });

    const total = usage._sum.amount || 0;
    return { ok: total < limit, used: total, limit };
  }
}

export const billingService = new BillingService();
