// src/services/billingService.ts
import { prisma } from "../utils/prisma";

export class BillingService {
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

  async getUsageReport(userId: string) {
    const [api, projects, storage] = await Promise.all([
      this.trackApiUsage(userId),
      this.trackProjects(userId),
      this.trackStorage(userId),
    ]);

    return { api, projects, storageMB: storage / (1024 * 1024) };
  }
}
