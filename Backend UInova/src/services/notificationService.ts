// src/services/notificationService.ts
import { prisma } from "../utils/prisma";
import { io } from "../utils/socket";

export class NotificationService {
  async createNotification(userId: string, message: string, type: string = "info") {
    const notif = await prisma.notification.create({
      data: { userId, message, type },
    });

    // Push en temps réel
    io.to(userId).emit("notification", notif);
    return notif;
  }

  async listNotifications(userId: string) {
    return prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  }
}
