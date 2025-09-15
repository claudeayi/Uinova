// src/services/notificationService.ts
import { prisma } from "../utils/prisma";
import { io } from "./collab"; // Socket.io global
import { emitEvent } from "./eventBus";
import { sendMail } from "../utils/mailer";
import client from "prom-client";
import { scheduleJob } from "../utils/scheduler";

export class NotificationService {
  /* ============================================================================
   * 📊 Metrics Prometheus
   * ========================================================================== */
  private counterCreated = new client.Counter({
    name: "uinova_notifications_created_total",
    help: "Nombre total de notifications créées",
    labelNames: ["type"],
  });

  private counterDelivered = new client.Counter({
    name: "uinova_notifications_delivered_total",
    help: "Nombre total de notifications livrées (Socket.io + Webhooks + Email)",
    labelNames: ["channel"],
  });

  private counterFailed = new client.Counter({
    name: "uinova_notifications_failed_total",
    help: "Nombre total de notifications échouées",
    labelNames: ["channel"],
  });

  /* ============================================================================
   * Création
   * ========================================================================== */
  async create(userId: string, type: string, title: string, body?: string) {
    const notif = await prisma.notification.create({
      data: { userId, type, title, body },
    });

    this.counterCreated.labels(type).inc();

    // 🔥 Dispatch multi-canal
    this.dispatch(userId, notif).catch((err) =>
      console.error("❌ Notification dispatch error:", err)
    );

    // 🔔 Scheduler : rappel si notification critique pas lue dans 24h
    if (type === "ALERT" || type === "BILLING") {
      scheduleJob(`reminder-${notif.id}`, new Date(Date.now() + 24 * 3600 * 1000), async () => {
        const fresh = await prisma.notification.findUnique({ where: { id: notif.id } });
        if (fresh && !fresh.read) {
          const email = await this.getUserEmail(userId);
          if (email) {
            await sendMail({
              to: email,
              subject: `⏰ Rappel : ${title}`,
              text: body || "Vous avez une notification importante non lue.",
            });
            console.log(`📧 Rappel envoyé à ${email} pour notif ${notif.id}`);
          }
        }
      });
    }

    return notif;
  }

  /* ============================================================================
   * Marquer comme lue
   * ========================================================================== */
  async markAsRead(notificationId: string) {
    return prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });
  }

  /* ============================================================================
   * Récupérer les notifs utilisateur
   * ========================================================================== */
  async getUserNotifications(userId: string) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  /* ============================================================================
   * Dispatch multi-canal
   * ========================================================================== */
  private async dispatch(userId: string, notif: any) {
    // 🔹 Socket.io (temps réel)
    try {
      io?.to(userId).emit("notification", notif);
      this.counterDelivered.labels("socket").inc();
    } catch (err) {
      this.counterFailed.labels("socket").inc();
      console.error("❌ Socket.io notif error:", err);
    }

    // 🔹 EventBus / Webhooks externes
    try {
      emitEvent("notification.created", { userId, notif });
      this.counterDelivered.labels("webhook").inc();
    } catch (err) {
      this.counterFailed.labels("webhook").inc();
      console.error("❌ EventBus notif error:", err);
    }

    // 🔹 Email (optionnel selon type)
    try {
      if (notif.type === "ALERT" || notif.type === "BILLING") {
        const email = await this.getUserEmail(userId);
        if (email) {
          await sendMail({
            to: email,
            subject: notif.title,
            text: notif.body || "",
          });
          this.counterDelivered.labels("email").inc();
        }
      }
    } catch (err) {
      this.counterFailed.labels("email").inc();
      console.error("❌ Email notif error:", err);
    }
  }

  /* ============================================================================
   * Helpers
   * ========================================================================== */
  private async getUserEmail(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    return user?.email || "";
  }
}

export const notificationService = new NotificationService();
