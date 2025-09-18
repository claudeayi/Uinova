// src/services/notificationService.ts
import { prisma } from "../utils/prisma";
import { io } from "./collab";
import { emitEvent } from "./eventBus";
import { sendMail } from "../utils/mailer";
import { scheduleJob } from "../utils/scheduler";
import { auditLog } from "./auditLogService";
import { logger } from "../utils/logger";
import client from "prom-client";

/* ============================================================================
 * Service Notifications multi-canal (Socket.io, Webhook, Email)
 * ============================================================================
 */
export class NotificationService {
  /* ============================================================================
   * 📊 Metrics Prometheus
   * ============================================================================
   */
  private counterCreated = new client.Counter({
    name: "uinova_notifications_created_total",
    help: "Nombre total de notifications créées",
    labelNames: ["type"],
  });

  private counterDelivered = new client.Counter({
    name: "uinova_notifications_delivered_total",
    help: "Nombre de notifications livrées",
    labelNames: ["channel", "type"],
  });

  private counterFailed = new client.Counter({
    name: "uinova_notifications_failed_total",
    help: "Nombre de notifications échouées",
    labelNames: ["channel", "type"],
  });

  private histogramLatency = new client.Histogram({
    name: "uinova_notifications_latency_ms",
    help: "Latence de livraison des notifications",
    labelNames: ["channel", "type"],
    buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000],
  });

  /* ============================================================================
   * Création
   * ============================================================================
   */
  async create(userId: string, type: string, title: string, body?: string) {
    const notif = await prisma.notification.create({
      data: { userId, type, title, body },
    });

    this.counterCreated.labels(type).inc();
    await auditLog.log(userId, "NOTIFICATION_CREATED", { type, title, body });

    // 🔥 Dispatch multi-canal
    this.dispatch(userId, notif).catch((err) =>
      logger.error("❌ Notification dispatch error:", err?.message)
    );

    // 🔔 Scheduler : rappel si notif critique pas lue dans 24h
    if (["ALERT", "BILLING"].includes(type)) {
      scheduleJob(
        `reminder-${notif.id}`,
        new Date(Date.now() + 24 * 3600 * 1000),
        async () => {
          const fresh = await prisma.notification.findUnique({ where: { id: notif.id } });
          if (fresh && !fresh.read) {
            const email = await this.getUserEmail(userId);
            if (email) {
              await sendMail({
                to: email,
                subject: `⏰ Rappel : ${title}`,
                text: body || "Vous avez une notification importante non lue.",
              });
              logger.info(`📧 Rappel envoyé à ${email} pour notif ${notif.id}`);
            }
          }
        }
      );
    }

    return notif;
  }

  /* ============================================================================
   * Marquer comme lue
   * ============================================================================
   */
  async markAsRead(notificationId: string) {
    const notif = await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });

    await auditLog.log(notif.userId, "NOTIFICATION_READ", { notificationId });
    emitEvent("notification.read", { userId: notif.userId, notificationId });

    return notif;
  }

  /* ============================================================================
   * Récupérer les notifs utilisateur
   * ============================================================================
   */
  async getUserNotifications(userId: string) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  /* ============================================================================
   * Dispatch multi-canal
   * ============================================================================
   */
  private async dispatch(userId: string, notif: any) {
    const type = notif.type;
    const start = Date.now();

    /* 🔹 Socket.io */
    try {
      io?.to(userId).emit("notification", notif);
      this.counterDelivered.labels("socket", type).inc();
      this.histogramLatency.labels("socket", type).observe(Date.now() - start);
      emitEvent("notification.socket.delivered", { userId, notif });
    } catch (err) {
      this.counterFailed.labels("socket", type).inc();
      logger.error("❌ Socket.io notif error:", err);
    }

    /* 🔹 Webhooks */
    try {
      emitEvent("notification.created", { userId, notif });
      this.counterDelivered.labels("webhook", type).inc();
      this.histogramLatency.labels("webhook", type).observe(Date.now() - start);
    } catch (err) {
      this.counterFailed.labels("webhook", type).inc();
      logger.error("❌ Webhook notif error:", err);
    }

    /* 🔹 Email */
    if (["ALERT", "BILLING"].includes(type)) {
      try {
        const email = await this.getUserEmail(userId);
        if (email) {
          await sendMail({
            to: email,
            subject: notif.title,
            text: notif.body || "",
          });
          this.counterDelivered.labels("email", type).inc();
          this.histogramLatency.labels("email", type).observe(Date.now() - start);
          emitEvent("notification.email.delivered", { userId, notif, email });
        }
      } catch (err) {
        this.counterFailed.labels("email", type).inc();
        logger.error("❌ Email notif error:", err);
      }
    }

    await auditLog.log(userId, "NOTIFICATION_DISPATCHED", {
      type,
      id: notif.id,
    });
  }

  /* ============================================================================
   * Helpers
   * ============================================================================
   */
  private async getUserEmail(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    return user?.email || "";
  }
}

export const notificationService = new NotificationService();
