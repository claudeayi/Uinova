// src/services/subscriptionService.ts
import { prisma } from "../utils/prisma";
import { PaymentStatus, Plan } from "@prisma/client";

export class SubscriptionService {
  async createSubscription(userId: string, plan: Plan, paymentId: string) {
    return prisma.subscription.create({
      data: {
        userId,
        plan,
        status: PaymentStatus.PENDING,
        paymentId,
        renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  }

  async activateSubscription(subscriptionId: string) {
    return prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: PaymentStatus.ACTIVE },
    });
  }

  async cancelSubscription(subscriptionId: string) {
    return prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: PaymentStatus.CANCELED },
    });
  }

  async getUserSubscription(userId: string) {
    return prisma.subscription.findFirst({ where: { userId } });
  }
}
