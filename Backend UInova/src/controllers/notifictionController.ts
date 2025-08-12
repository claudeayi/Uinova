// src/controllers/notificationController.ts
import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../utils/prisma";

// (optionnel) push temps réel via Socket.io
// expose quelque part io: Server
let io: any = null;
try { io = require("../services/collab").io; } catch { /* ok si absent */ }

// ===================
// Validation Schemas
// ===================
const NotifySchema = z.object({
  title: z.string().min(1).max(120),
  message: z.string().min(1).max(1000),
  type: z.enum(["INFO", "SUCCESS", "WARNING", "ERROR"]).default("INFO"),
  actionUrl: z.string().url().optional(),
  meta: z.record(z.any()).optional(),
  userId: z.string().cuid().optional(),   // ADMIN peut notifier un autre user
});

const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  unreadOnly: z.coerce.boolean().optional(),
  since: z.coerce.date().optional(), // ISO date
  type: z.enum(["INFO", "SUCCESS", "WARNING", "ERROR"]).optional(),
  userId: z.string().cuid().optional(),   // ADMIN peut lister pour un autre user
  sort: z.enum(["createdAt:desc", "createdAt:asc"]).default("createdAt:desc"),
});

const IdParam = z.object({ id: z.string() }); // string cuid par défaut

// ==============
// Small helpers
// ==============
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

// ==========================
// POST /api/notifications
// Body: { title, message, type?, actionUrl?, meta?, userId? }
// - USER : crée pour lui-même (userId ignoré)
// - ADMIN : peut cibler un autre user via userId
// ==========================
export const notify = async (req: Request, res: Response) => {
  const caller = ensureAuth(req);
  const data = NotifySchema.parse(req.body);

  const targetUserId = data.userId && data.userId !== caller.id
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

  // Push temps réel (optionnel)
  if (io) {
    io.to(`user:${targetUserId}`).emit("notification:new", notif);
  }

  res.status(201).json({ ok: true, notification: notif });
};

// ==========================
// GET /api/notifications
// Query: page, pageSize, unreadOnly?, since?, type?, userId?(ADMIN), sort?
// Réponse: { items, page, pageSize, total, totalPages, unreadCount }
// ==========================
export const list = async (req: Request, res: Response) => {
  const caller = ensureAuth(req);
  const q = ListQuerySchema.safeParse(req.query);
  if (!q.success) return res.status(400).json({ error: "Invalid query", details: q.error.flatten() });
  const { page, pageSize, unreadOnly, since, type, userId, sort } = q.data;

  const targetUserId = userId && userId !== caller.id ? (ensureAdmin(caller.role), userId) : caller.id;

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

  res.json({
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    unreadCount,
  });
};

// ==========================
// POST /api/notifications/:id/read
// Marque une notification comme lue
// ==========================
export const markRead = async (req: Request, res: Response) => {
  const caller = ensureAuth(req);
  const { id } = IdParam.parse(req.params);

  const n = await prisma.notification.findUnique({ where: { id }, select: { id: true, userId: true, read: true } });
  if (!n) return res.status(404).json({ error: "Not found" });
  if (caller.role !== "ADMIN" && n.userId !== caller.id) return res.status(403).json({ error: "Forbidden" });
  if (n.read) return res.json({ ok: true }); // idempotent

  await prisma.notification.update({ where: { id }, data: { read: true } });
  res.json({ ok: true });
};

// ==========================
// POST /api/notifications/read-all
// Marque toutes les notifications de l'utilisateur (ou d'un userId ciblé par ADMIN) comme lues
// Body: { userId? } (ADMIN uniquement pour cibler un autre)
// ==========================
export const markAllRead = async (req: Request, res: Response) => {
  const caller = ensureAuth(req);
  const body = z.object({ userId: z.string().cuid().optional() }).parse(req.body);
  const targetUserId = body.userId && body.userId !== caller.id ? (ensureAdmin(caller.role), body.userId) : caller.id;

  await prisma.notification.updateMany({ where: { userId: targetUserId, read: false }, data: { read: true } });
  res.json({ ok: true });
};

// ==========================
// DELETE /api/notifications/:id
// Supprime une notification (ADMIN ou propriétaire)
// ==========================
export const remove = async (req: Request, res: Response) => {
  const caller = ensureAuth(req);
  const { id } = IdParam.parse(req.params);

  const n = await prisma.notification.findUnique({ where: { id }, select: { id: true, userId: true } });
  if (!n) return res.status(404).json({ error: "Not found" });
  if (caller.role !== "ADMIN" && n.userId !== caller.id) return res.status(403).json({ error: "Forbidden" });

  await prisma.notification.delete({ where: { id } });
  res.json({ ok: true });
};
