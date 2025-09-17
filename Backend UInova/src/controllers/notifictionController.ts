// src/controllers/notificationController.ts
import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import { notificationService } from "../services/notificationService";

// Socket.io temps réel
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
  type: z.enum(["INFO", "SUCCESS", "WARNING", "ERROR", "ALERT", "BILLING", "SYSTEM"]).default("INFO"),
  actionUrl: z.string().url().optional(),
  meta: z.record(z.any()).optional(),
  dedupKey: z.string().optional(), // idempotence
  userId: z.string().cuid().optional(), 
  broadcast: z.boolean().optional(),
});

const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  unreadOnly: z.coerce.boolean().optional(),
  since: z.coerce.date().optional(),
  type: z.enum(["INFO", "SUCCESS", "WARNING", "ERROR", "ALERT", "BILLING", "SYSTEM"]).optional(),
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

/* ============================================================================
 *  CONTROLLERS
 * ========================================================================== */

// ✅ Créer une notification (simple ou broadcast)
export const notify = async (req: Request, res: Response) => {
  try {
    const caller = ensureAuth(req);
    const data = NotifySchema.parse(req.body);

    // Idempotence par clé
    if (data.dedupKey) {
      const existing = await prisma.notification.findFirst({ where: { dedupKey: data.dedupKey } });
      if (existing) {
        return res.json({ success: true, data: existing, deduped: true });
      }
    }

    // Broadcast
    if (data.broadcast) {
      ensureAdmin(caller.role);
      const users = await prisma.user.findMany({ select: { id: true } });

      const results = await Promise.all(
        users.map((u) => notificationService.create(u.id, data.type, data.title, data.message, data.dedupKey))
      );

      await prisma.auditLog.create({
        data: { action: "NOTIFICATION_BROADCAST", userId: caller.id, metadata: { count: users.length, ip: req.ip } },
      });

      io?.emit("notification:broadcast", { title: data.title, message: data.message });

      return res.status(201).json({ success: true, count: results.length });
    }

    // Individuel
    const targetUserId = data.userId && data.userId !== caller.id ? (ensureAdmin(caller.role), data.userId) : caller.id;

    const notif = await notificationService.create(
      targetUserId,
      data.type,
      data.title,
      data.message,
      data.dedupKey
    );

    await prisma.auditLog.create({
      data: { action: "NOTIFICATION_CREATED", userId: caller.id, metadata: { targetUserId, ip: req.ip } },
    });

    io?.to(targetUserId).emit("notification:new", notif);

    return res.status(201).json({ success: true, data: notif });
  } catch (err: any) {
    console.error("❌ notify error:", err);
    return res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// ✅ Lister
export const list = async (req: Request, res: Response) => {
  try {
    const caller = ensureAuth(req);
    const q = ListQuerySchema.parse(req.query);

    const { page, pageSize, unreadOnly, since, type, userId, sort } = q;
    const targetUserId = userId && userId !== caller.id ? (ensureAdmin(caller.role), userId) : caller.id;

    const where: any = { userId: targetUserId, deletedAt: null };
    if (unreadOnly) where.read = false;
    if (since) where.createdAt = { gte: since };
    if (type) where.type = type;

    const [sortField, sortDir] = sort.split(":") as ["createdAt", "asc" | "desc"];
    const orderBy: any = { [sortField]: sortDir };

    const [total, items, unreadCount] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.notification.count({ where: { userId: targetUserId, read: false, deletedAt: null } }),
    ]);

    return res.json({ success: true, page, pageSize, total, totalPages: Math.ceil(total / pageSize), unreadCount, data: items });
  } catch (err: any) {
    console.error("❌ list error:", err);
    return res.status(500).json({ success: false, message: "Erreur récupération notifications" });
  }
};

// ✅ Marquer lue
export const markRead = async (req: Request, res: Response) => { /* inchangé */ };

// ✅ Tout marquer lu
export const markAllRead = async (req: Request, res: Response) => { /* inchangé */ };

// ✅ Soft delete
export const remove = async (req: Request, res: Response) => {
  try {
    const caller = ensureAuth(req);
    const { id } = IdParam.parse(req.params);

    const n = await prisma.notification.findUnique({ where: { id } });
    if (!n) return res.status(404).json({ success: false, message: "Not found" });
    if (caller.role !== "ADMIN" && n.userId !== caller.id) return res.status(403).json({ success: false, message: "Forbidden" });

    await prisma.notification.update({ where: { id }, data: { deletedAt: new Date() } });

    await prisma.auditLog.create({
      data: { action: "NOTIFICATION_REMOVED", userId: caller.id, metadata: { notifId: id, targetUserId: n.userId } },
    });

    return res.json({ success: true, message: "Notification supprimée (soft delete)" });
  } catch (err: any) {
    console.error("❌ remove error:", err);
    return res.status(500).json({ success: false, message: "Erreur suppression notification" });
  }
};

// 🔙 Restaurer une notif
export const restore = async (req: Request, res: Response) => {
  try {
    ensureAdmin((req as any).user?.role);
    const { id } = IdParam.parse(req.params);

    const restored = await prisma.notification.update({ where: { id }, data: { deletedAt: null } });
    return res.json({ success: true, data: restored });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 📊 Stats par type (admin)
export const stats = async (req: Request, res: Response) => {
  try {
    ensureAdmin((req as any).user?.role);
    const grouped = await prisma.notification.groupBy({
      by: ["type"],
      _count: true,
    });
    return res.json({ success: true, data: grouped });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 📤 Export multi-format
export const exportNotifications = async (req: Request, res: Response) => {
  try {
    const caller = ensureAuth(req);
    const { format = "json" } = req.query;
    const notifs = await prisma.notification.findMany({ where: { userId: caller.id } });

    if (format === "json") return res.json({ success: true, data: notifs });
    if (format === "csv") {
      const header = "id,title,message,type,read,createdAt\n";
      const rows = notifs.map((n) => `${n.id},"${n.title}","${n.message}",${n.type},${n.read},${n.createdAt.toISOString()}`).join("\n");
      res.setHeader("Content-Type", "text/csv");
      return res.send(header + rows);
    }
    if (format === "md") {
      const md = notifs.map((n) => `### ${n.title}\n- Type: ${n.type}\n- Date: ${n.createdAt.toISOString()}\n\n${n.message}`).join("\n\n");
      res.type("text/markdown").send(md);
    }
    return res.status(400).json({ message: "Format non supporté" });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 🧹 Purge (admin)
export const purgeOld = async (_req: Request, res: Response) => {
  try {
    const cutoff = new Date(Date.now() - 1000 * 60 * 60 * 24 * 90); // 90j
    const deleted = await prisma.notification.deleteMany({ where: { createdAt: { lt: cutoff } } });
    return res.json({ success: true, deleted: deleted.count });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
