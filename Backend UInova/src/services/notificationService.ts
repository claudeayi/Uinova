import { prisma } from "../utils/prisma";
import { io } from "./collab"; // Socket.io global déjà initialisé
import { emitEvent } from "./eventBus";
import { sendMail } from "../utils/mailer";

export class NotificationService {
  /**
   * Crée une notification persistante en DB
   */
  async create(userId: string, type: string, title: string, body?: string) {
    const notif = await prisma.notification.create({
      data: { userId, type, title, body },
    });

    // Diffuser la notif sur tous les canaux
    this.dispatch(userId, notif);

    return notif;
  }

  /**
   * Marque une notification comme lue
   */
  async markAsRead(notificationId: string) {
    return prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });
  }

  /**
   * Récupère toutes les notifications d’un utilisateur
   */
  async getUserNotifications(userId: string) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  /**
   * Dispatch multi-canal
   */
  private async dispatch(userId: string, notif: any) {
    // 🔹 Socket.io (temps réel)
    try {
      io?.to(userId).emit("notification", notif);
    } catch (err) {
      console.error("❌ Socket.io notif error:", err);
    }

    // 🔹 EventBus / Webhooks externes
    try {
      emitEvent("notification.created", { userId, notif });
    } catch (err) {
      console.error("❌ EventBus notif error:", err);
    }

    // 🔹 Email (optionnel, selon type)
    try {
      if (notif.type === "ALERT" || notif.type === "BILLING") {
        await sendMail({
          to: await this.getUserEmail(userId),
          subject: notif.title,
          text: notif.body || "",
        });
      }
    } catch (err) {
      console.error("❌ Email notif error:", err);
    }
  }

  /**
   * Helper : récupérer email utilisateur
   */
  private async getUserEmail(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    return user?.email || "";
  }
}

export const notificationService = new NotificationService();
