// src/models/notificationModel.ts
import { prisma } from "../utils/prisma";

/** Types supportés (à adapter si besoin) */
export const NOTIF_TYPES = ["INFO", "SUCCESS", "WARNING", "ERROR"] as const;
export type NotifType = typeof NOTIF_TYPES[number];

type Id = string | number;

const selectNotif = {
  id: true,
  userId: true,
  title: true,
  message: true,
  type: true,
  actionUrl: true,
  read: true,          // ⚠ si ton schéma utilise "seen" remplace par seen
  meta: true as const,
  createdAt: true,
};

function toId(v: Id): any {
  const n = Number(v);
  return Number.isFinite(n) && String(n) === String(v) ? n : String(v);
}

export type NotificationDTO = {
  id: Id;
  userId: Id;
  title: string;
  message: string;
  type: NotifType | string;
  actionUrl: string | null;
  read: boolean;
  meta: Record<string, any> | null;
  createdAt: Date;
};

export function toNotificationDTO(n: any): NotificationDTO {
  return {
    id: n.id,
    userId: n.userId,
    title: n.title,
    message: n.message,
    type: n.type,
    actionUrl: n.actionUrl ?? null,
    read: !!n.read,
    meta: n.meta ?? null,
    createdAt: n.createdAt,
  };
}

/* =========================
 * CREATE
 * ========================= */
export async function addNotification(params: {
  userId: Id;
  title: string;
  message: string;
  type?: NotifType;
  actionUrl?: string | null;
  meta?: Record<string, any>;
}): Promise<NotificationDTO> {
  const rec = await prisma.notification.create({
    data: {
      userId: toId(params.userId),
      title: params.title,
      message: params.message,
      type: params.type ?? "INFO",
      actionUrl: params.actionUrl ?? null,
      meta: params.meta ?? {},
    },
    select: selectNotif,
  });
  return toNotificationDTO(rec);
}

/* =========================
 * LIST (pagination/filtre)
 * ========================= */
export async function getNotificationsByUser(
  userId: Id,
  opts?: {
    unreadOnly?: boolean;
    since?: Date;
    type?: NotifType;
    page?: number;
    pageSize?: number;
    sort?: "createdAt:desc" | "createdAt:asc";
  }
): Promise<{ items: NotificationDTO[]; page: number; pageSize: number; total: number; totalPages: number; unreadCount: number }> {
  const page = Math.max(1, opts?.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts?.pageSize ?? 20));
  const [field, dir] = (opts?.sort ?? "createdAt:desc").split(":") as ["createdAt", "asc" | "desc"];

  const where: any = { userId: toId(userId) };
  if (opts?.unreadOnly) where.read = false; // ⚠ remplace read par seen si besoin
  if (opts?.since) where.createdAt = { gte: opts.since };
  if (opts?.type) where.type = opts.type;

  const [total, rows, unreadCount] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      orderBy: { [field]: dir },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: selectNotif,
    }),
    prisma.notification.count({ where: { userId: toId(userId), read: false } }),
  ]);

  return {
    items: rows.map(toNotificationDTO),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    unreadCount,
  };
}

/* =========================
 * GET ONE
 * ========================= */
export async function getNotificationById(id: Id): Promise<NotificationDTO | null> {
  const rec = await prisma.notification.findUnique({ where: { id: toId(id) } as any, select: selectNotif });
  return rec ? toNotificationDTO(rec) : null;
}

/* =========================
 * MARK READ / MARK ALL
 * ========================= */
export async function markNotificationAsRead(id: Id): Promise<NotificationDTO> {
  const rec = await prisma.notification.update({
    where: { id: toId(id) } as any,
    data: { read: true }, // ⚠ si ton schéma a "seen", remplace { read: true } par { seen: true }
    select: selectNotif,
  });
  return toNotificationDTO(rec);
}

export async function markAllNotificationsAsRead(userId: Id): Promise<{ ok: true; count: number }> {
  const res = await prisma.notification.updateMany({
    where: { userId: toId(userId), read: false },
    data: { read: true },
  });
  return { ok: true, count: res.count };
}

/* =========================
 * DELETE
 * ========================= */
export async function deleteNotification(id: Id): Promise<NotificationDTO> {
  const rec = await prisma.notification.delete({ where: { id: toId(id) } as any, select: selectNotif });
  return toNotificationDTO(rec);
}
