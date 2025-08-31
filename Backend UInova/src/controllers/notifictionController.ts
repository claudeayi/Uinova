// src/controllers/notificationController.ts
import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../utils/prisma";

// (optionnel) push temps réel via Socket.io
let io: any = null;
try {
  io = require("../services/collab").io;
} catch {
  /* ok si absent */
}

/* ============================================================================
 *  SCHEMAS
 * ========================================================================== */
const NotifySchema = z.object({
  title: z.string().min(1).max(120),
  message: z.string().min(1).max(1000),
  type: z.enum(["INFO", "SUCCESS", "WARNING", "ERROR"]).default("INFO"),
  actionUrl: z.string().url().optional(),
  meta: z.record(z.any()).optional(),
  userId: z.string().cuid().optional(), // ADMIN peut notifier un autre user
  broadcast: z.boolean().optional(),    // ADMIN peut notifier tous les users
});

const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  unreadOnly: z.coerce.boolean().optional(),
  since: z.coerce.date().optional(),
  type: z.enum(["INFO", "SUCCESS", "WARNING", "ERROR"]).optional(),
  userId: z.string().cuid().optional(),
  sort: z.enum(["createdAt:desc", "createdAt:asc"]).default("createdAt:desc"),
});

const IdParam = z.object({ id: z.string() });

/* ============================================================================
 *  HELPERS
 * ========================================================================== */
function ensureAuth(req: Request) {
  const u = (req as any).user;
  if (!u?.sub && !u?.id) {
    const err: any = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }
  return { id: u.sub || u.id, role: u.role || "USER" };
}
function ensureAdmin(role?: string) {
  if (role !== "ADMIN") {
    const err: any = new Error("Forbidden");
    err.status = 403;
    throw err;
  }
}

const selectNotif = {
  id: true,
  userId: true,
  title: true,
  message: true,
  type: true,
  actionUrl: true,
  read: true,
  createdAt: true,
  meta: true as const,
};

/* ============================================================================
 *  CONTROLLERS
 * ========================================================================== */

// ✅ Créer une notification
export const notify = async (req: Request, res: Response) => {
  try {
    const caller = ensureAuth(req);
    const data = NotifySchema.parse(req.body);

    // Admin peut broadcaster
    if (data.broadcast) {
      ensureAdmin(caller.role);

      const users = await prisma.user.findMany({ select: { id: true } });
      const notifs = await prisma.$transaction(
        users.map((u) =>
          prisma.notification.create({
            data: {
              userId: u.id,
              title: data.title,
              message: data.message,
              type: data.type,
              actionUrl: data.actionUrl ?? null,
              meta: data.meta ?? {},
            },
            select: selectNotif,
          })
        )
      );

      if (io) {
        users.forEach((u, i) =>
          io.to(`user:${u.id}`).emit("notification:new", notifs[i])
        );
      }

      await prisma.auditLog.create({
        data: {
          action: "NOTIFICATION_BROADCAST",
          userId: caller.id,
          details: `Notification envoyée à ${users.length} users`,
        },
      });

      return res.status(201).json({ success: true, count: users.length });
    }

    // Sinon → notification à soi ou à un autre user
    const targetUserId =
      data.userId && data.userId !== caller.id
        ? (ensureAdmin(caller.role), data.userId)
        : caller.id;

    const notif = await prisma.notification.create({
      data: {
        userId: targetUserId,
        title: data.title,
        message: data.message,
        type: data.type,
        actionUrl: data.actionUrl ?? null,
        meta: data.meta ?? {},
      },
      select: selectNotif,
    });

    if (io) io.to(`user:${targetUserId}`).emit("notification:new", notif);

    await prisma.auditLog.create({
      data: {
        action: "NOTIFICATION_CREATED",
        userId: caller.id,
        details: `Notification envoyée à ${targetUserId}`,
      },
    });

    return res.status(201).json({ success: true, data: notif });
  } catch (err: any) {
    console.error("❌ notify error:", err);
    return res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// ✅ Lister les notifications
export const list = async (req: Request, res: Response) => {
  try {
    const caller = ensureAuth(req);
    const q = ListQuerySchema.parse(req.query);

    const { page, pageSize, unreadOnly, since, type, userId, sort } = q;
    const targetUserId =
      userId && userId !== caller.id ? (ensureAdmin(caller.role), userId) : caller.id;

    const where: any = { userId: targetUserId };
    if (unreadOnly) where.read = false;
    if (since) where.createdAt = { gte: since };
    if (type) where.type = type;

    const [sortField, sortDir] = sort.split(":") as ["createdAt", "asc" | "desc"];
    const orderBy: any = { [sortField]: sortDir };

    const [total, items, unreadCount] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: selectNotif,
      }),
      prisma.notification.count({ where: { userId: targetUserId, read: false } }),
    ]);

    return res.json({
      success: true,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      unreadCount,
      data: items,
    });
  } catch (err: any) {
    console.error("❌ list notifications error:", err);
    return res.status(500).json({ success: false, message: "Erreur récupération notifications" });
  }
};

// ✅ Marquer une notification comme lue
export const markRead = async (req: Request, res: Response) => {
  try {
    const caller = ensureAuth(req);
    const { id } = IdParam.parse(req.params);

    const n = await prisma.notification.findUnique({
      where: { id },
      select: { id: true, userId: true, read: true },
    });
    if (!n) return res.status(404).json({ success: false, message: "Not found" });
    if (caller.role !== "ADMIN" && n.userId !== caller.id)
      return res.status(403).json({ success: false, message: "Forbidden" });
    if (n.read) return res.json({ success: true }); // idempotent

    await prisma.notification.update({ where: { id }, data: { read: true } });

    await prisma.auditLog.create({
      data: { action: "NOTIFICATION_READ", userId: caller.id, details: `Notif ${id}` },
    });

    return res.json({ success: true });
  } catch (err: any) {
    console.error("❌ markRead error:", err);
    return res.status(500).json({ success: false, message: "Erreur lecture notification" });
  }
};

// ✅ Marquer toutes comme lues
export const markAllRead = async (req: Request, res: Response) => {
  try {
    const caller = ensureAuth(req);
    const body = z.object({ userId: z.string().cuid().optional() }).parse(req.body);

    const targetUserId =
      body.userId && body.userId !== caller.id ? (ensureAdmin(caller.role), body.userId) : caller.id;

    const updated = await prisma.notification.updateMany({
      where: { userId: targetUserId, read: false },
      data: { read: true },
    });

    await prisma.auditLog.create({
      data: {
        action: "NOTIFICATION_READ_ALL",
        userId: caller.id,
        details: `Mark all read for ${targetUserId} (${updated.count} notifs)`,
      },
    });

    return res.json({ success: true, updated: updated.count });
  } catch (err: any) {
    console.error("❌ markAllRead error:", err);
    return res.status(500).json({ success: false, message: "Erreur lecture notifications" });
  }
};

// ✅ Supprimer une notification
export const remove = async (req: Request, res: Response) => {
  try {
    const caller = ensureAuth(req);
    const { id } = IdParam.parse(req.params);

    const n = await prisma.notification.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });
    if (!n) return res.status(404).json({ success: false, message: "Not found" });
    if (caller.role !== "ADMIN" && n.userId !== caller.id)
      return res.status(403).json({ success: false, message: "Forbidden" });

    await prisma.notification.delete({ where: { id } });

    await prisma.auditLog.create({
      data: { action: "NOTIFICATION_REMOVED", userId: caller.id, details: `Notif ${id}` },
    });

    return res.json({ success: true, message: "Notification supprimée" });
  } catch (err: any) {
    console.error("❌ remove notification error:", err);
    return res.status(500).json({ success: false, message: "Erreur suppression notification" });
  }
};
