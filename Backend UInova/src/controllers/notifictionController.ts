// src/controllers/notificationController.ts
import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import { notificationService } from "../services/notificationService";

// (optionnel) push temps réel via Socket.io (fallback direct)
let io: any = null;
try {
  io = require("../services/collab").io;
} catch {
  /* ok si absent */
}

// (optionnel) PDF export – soft import pour ne pas casser si non installé
let PDFDocument: any = null;
try {
  PDFDocument = require("pdfkit");
} catch {
  /* ok si absent */
}

// (optionnel) Bull/BullMQ queue pour scheduling – soft import
let notificationQueue: any = null;
try {
  notificationQueue = require("../services/notificationQueue")?.notificationQueue || null;
} catch {
  /* ok si absent */
}

/* ============================================================================
 *  SCHEMAS
 * ========================================================================== */
const NotifySchema = z.object({
  title: z.string().min(1).max(120),
  message: z.string().min(1).max(2000),
  type: z
    .enum(["INFO", "SUCCESS", "WARNING", "ERROR", "ALERT", "BILLING", "SYSTEM"])
    .default("INFO"),
  actionUrl: z.string().url().optional(),
  meta: z.record(z.any()).optional(),
  userId: z.string().optional(), // ADMIN peut notifier un autre user
  broadcast: z.boolean().optional(), // ADMIN peut notifier tous les users
  priority: z.enum(["low", "normal", "high", "critical"]).optional().default("normal"),
  dedupKey: z.string().max(120).optional(), // idempotence
  scheduledAt: z.coerce.date().optional(),   // scheduling
  templateId: z.string().optional(),         // modèle réutilisable
});

const UpdateSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  message: z.string().min(1).max(2000).optional(),
  type: z
    .enum(["INFO", "SUCCESS", "WARNING", "ERROR", "ALERT", "BILLING", "SYSTEM"])
    .optional(),
  actionUrl: z.string().url().optional().nullable(),
  meta: z.record(z.any()).optional(),
  priority: z.enum(["low", "normal", "high", "critical"]).optional(),
});

const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  unreadOnly: z.coerce.boolean().optional(),
  since: z.coerce.date().optional(),
  until: z.coerce.date().optional(),
  type: z
    .enum(["INFO", "SUCCESS", "WARNING", "ERROR", "ALERT", "BILLING", "SYSTEM"])
    .optional(),
  priority: z.enum(["low", "normal", "high", "critical"]).optional(),
  userId: z.string().optional(),
  sort: z.enum(["createdAt:desc", "createdAt:asc"]).default("createdAt:desc"),
  q: z.string().trim().max(200).optional(),
  includeDeleted: z.coerce.boolean().optional(),
});

const IdParam = z.object({ id: z.string() });

const BulkIdsSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

const SnoozeSchema = z.object({
  until: z.coerce.date(),
  reason: z.string().max(200).optional(),
});

const ScheduleSchema = z.object({
  when: z.coerce.date(), // date future
  userId: z.string().optional(),
  broadcast: z.boolean().optional(),
  title: z.string().min(1).max(120),
  message: z.string().min(1).max(2000),
  type: z
    .enum(["INFO", "SUCCESS", "WARNING", "ERROR", "ALERT", "BILLING", "SYSTEM"])
    .default("INFO"),
  actionUrl: z.string().url().optional(),
  priority: z.enum(["low", "normal", "high", "critical"]).optional().default("normal"),
  meta: z.record(z.any()).optional(),
  dedupKey: z.string().max(120).optional(),
});

const TemplateUpsertSchema = z.object({
  code: z.string().min(2).max(100),
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(4000),
  type: z
    .enum(["INFO", "SUCCESS", "WARNING", "ERROR", "ALERT", "BILLING", "SYSTEM"])
    .default("INFO"),
  defaults: z.record(z.any()).optional(),
  description: z.string().max(200).optional(),
});

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
  return { id: u.sub || u.id, role: u.role || "USER", email: u.email || null };
}
function ensureAdmin(role?: string) {
  if (role !== "ADMIN") {
    const err: any = new Error("Forbidden");
    err.status = 403;
    throw err;
  }
}
function emitSocket(userId: string, event: string, payload: any) {
  try {
    io?.to?.(userId)?.emit?.(event, payload);
  } catch {}
}
function toCSV(rows: any[]) {
  if (!rows.length) return "id,title,message,type,priority,read,createdAt\n";
  const headers = [
    "id",
    "userId",
    "title",
    "message",
    "type",
    "priority",
    "read",
    "createdAt",
    "actionUrl",
  ];
  const esc = (v: any) =>
    v === null || v === undefined
      ? ""
      : String(v).replace(/"/g, '""').replace(/\r?\n/g, " ");
  return [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.id,
        r.userId,
        `"${esc(r.title)}"`,
        `"${esc(r.message)}"`,
        r.type,
        r.priority || "normal",
        r.read ? 1 : 0,
        new Date(r.createdAt).toISOString(),
        r.actionUrl || "",
      ].join(",")
    ),
  ].join("\n");
}
function toMarkdown(rows: any[]) {
  const head = `| id | userId | title | type | priority | read | createdAt |
| --- | --- | --- | --- | --- | --- | --- |`;
  const line = (r: any) =>
    `| ${r.id} | ${r.userId} | ${String(r.title).replace(/\|/g, "\\|")} | ${r.type} | ${r.priority || "normal"} | ${r.read ? "✅" : "❌"} | ${new Date(r.createdAt).toISOString()} |`;
  return [head, ...rows.map(line)].join("\n");
}
async function writePDF(res: Response, rows: any[]) {
  if (!PDFDocument) {
    res.status(501).json({ success: false, message: "PDF export non disponible (pdfkit manquant)" });
    return;
  }
  const doc = new PDFDocument({ margin: 40 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=notifications.pdf`);
  doc.pipe(res);
  doc.fontSize(18).text("Notifications Export", { underline: true });
  doc.moveDown();

  rows.forEach((r) => {
    doc
      .fontSize(12)
      .text(`ID: ${r.id}`)
      .text(`User: ${r.userId}`)
      .text(`Titre: ${r.title}`)
      .text(`Message: ${r.message}`)
      .text(`Type: ${r.type} | Priorité: ${r.priority || "normal"} | Lu: ${r.read ? "oui" : "non"}`)
      .text(`Créée: ${new Date(r.createdAt).toLocaleString()}`)
      .moveDown();
  });
  doc.end();
}

async function saveVersion(notifId: string) {
  try {
    const n = await prisma.notification.findUnique({ where: { id: notifId } });
    if (!n) return;
    await prisma.notificationVersion.create({
      data: {
        notificationId: n.id,
        title: n.title,
        message: n.message,
        type: n.type as any,
        actionUrl: n.actionUrl,
        read: n.read,
        priority: (n as any).priority || "normal",
        meta: n.meta,
        createdAt: new Date(),
      },
    });
  } catch (e) {
    console.warn("⚠️ saveVersion failed:", (e as any)?.message);
  }
}

/* ============================================================================
 *  CONTROLLERS – (conserve le code original, puis enrichit largement)
 * ========================================================================== */

// ✅ Créer une notification (simple, template, broadcast, scheduling, idempotence)
export const notify = async (req: Request, res: Response) => {
  try {
    const caller = ensureAuth(req);
    const data = NotifySchema.parse(req.body);

    // idempotence – déduplication optionnelle
    if (data.dedupKey) {
      const dup = await prisma.notification.findFirst({
        where: { dedupKey: data.dedupKey, userId: data.userId || caller.id },
        select: { id: true },
      });
      if (dup) {
        return res.status(200).json({ success: true, dedup: true, id: dup.id });
      }
    }

    // template -> substitution simple {{var}}
    let { title, message } = data;
    if (data.templateId) {
      const tpl = await prisma.notificationTemplate.findUnique({ where: { id: data.templateId } });
      if (tpl) {
        const render = (s: string) =>
          s.replace(/{{(.*?)}}/g, (_, key) => {
            const val = (data.meta || tpl.defaults || {})[key.trim()];
            return val !== undefined && val !== null ? String(val) : "";
          });
        title = render(tpl.title);
        message = render(tpl.body);
      }
    }

    // Scheduling
    if (data.scheduledAt && data.scheduledAt.getTime() > Date.now()) {
      // si une queue est dispo, on pousse une job
      if (notificationQueue?.add) {
        await notificationQueue.add("scheduled-notif", {
          payload: {
            ...data,
            title,
            message,
            creatorId: caller.id,
          },
        }, { delay: Math.max(0, data.scheduledAt.getTime() - Date.now()) });
      } else {
        // sinon, on persiste en SCHEDULED
        await prisma.scheduledNotification.create({
          data: {
            title,
            message,
            type: data.type,
            actionUrl: data.actionUrl || null,
            meta: data.meta || {},
            userId: data.userId || null,
            broadcast: !!data.broadcast,
            priority: data.priority || "normal",
            scheduledAt: data.scheduledAt,
            dedupKey: data.dedupKey || null,
            createdById: caller.id,
            status: "SCHEDULED",
          },
        });
      }

      await prisma.auditLog.create({
        data: {
          action: "NOTIFICATION_SCHEDULED",
          userId: caller.id,
          metadata: {
            targetUserId: data.userId || (data.broadcast ? "BROADCAST" : caller.id),
            when: data.scheduledAt,
            priority: data.priority || "normal",
            templateId: data.templateId || null,
            dedupKey: data.dedupKey || null,
            ip: req.ip,
            ua: req.headers["user-agent"] || null,
          },
        },
      });

      return res.status(202).json({ success: true, scheduled: true });
    }

    // Admin peut broadcaster
    if (data.broadcast) {
      ensureAdmin(caller.role);
      const users = await prisma.user.findMany({ select: { id: true } });
      const created = await prisma.$transaction(
        users.map((u) =>
          prisma.notification.create({
            data: {
              userId: u.id,
              title,
              message,
              type: data.type,
              actionUrl: data.actionUrl || null,
              meta: data.meta || {},
              read: false,
              dedupKey: data.dedupKey || null,
              priority: data.priority || "normal",
            },
          })
        )
      );

      // temps réel
      users.forEach((u, i) => emitSocket(u.id, "notification", created[i]));

      await prisma.auditLog.create({
        data: {
          action: "NOTIFICATION_BROADCAST",
          userId: caller.id,
          metadata: {
            count: users.length,
            ip: req.ip,
            ua: req.headers["user-agent"] || null,
          },
        },
      });

      return res.status(201).json({ success: true, count: created.length });
    }

    // Sinon → notification à soi ou à un autre user (si admin)
    const targetUserId =
      data.userId && data.userId !== caller.id
        ? (ensureAdmin(caller.role), data.userId)
        : caller.id;

    const notif = await prisma.notification.create({
      data: {
        userId: targetUserId,
        title,
        message,
        type: data.type,
        actionUrl: data.actionUrl || null,
        meta: data.meta || {},
        read: false,
        dedupKey: data.dedupKey || null,
        priority: data.priority || "normal",
      },
    });

    // diffusion parallèle via service (socket/webhook/email)
    try {
      notificationService.dispatch?.(targetUserId as any, notif as any);
    } catch {}
    emitSocket(targetUserId, "notification", notif);

    await prisma.auditLog.create({
      data: {
        action: "NOTIFICATION_CREATED",
        userId: caller.id,
        metadata: {
          targetUserId,
          ip: req.ip,
          ua: req.headers["user-agent"] || null,
        },
      },
    });

    return res.status(201).json({ success: true, data: notif });
  } catch (err: any) {
    console.error("❌ notify error:", err);
    return res
      .status(err.status || 500)
      .json({ success: false, message: err.message });
  }
};

// ✅ Lister les notifications (recherche, filtre, pagination, soft-delete)
export const list = async (req: Request, res: Response) => {
  try {
    const caller = ensureAuth(req);
    const q = ListQuerySchema.parse(req.query);

    const { page, pageSize, unreadOnly, since, until, type, priority, userId, sort, q: search, includeDeleted } = q;
    const targetUserId =
      userId && userId !== caller.id ? (ensureAdmin(caller.role), userId) : caller.id;

    const where: any = { userId: targetUserId };
    if (!includeDeleted) where.deletedAt = null;
    if (unreadOnly) where.read = false;
    if (since || until) {
      where.createdAt = {};
      if (since) where.createdAt.gte = since;
      if (until) where.createdAt.lte = until;
    }
    if (type) where.type = type;
    if (priority) where.priority = priority;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { message: { contains: search, mode: "insensitive" } },
      ];
    }

    const [sortField, sortDir] = sort.split(":") as ["createdAt", "asc" | "desc"];
    const orderBy: any = { [sortField]: sortDir };

    const [total, items, unreadCount] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          userId: true,
          title: true,
          message: true,
          type: true,
          actionUrl: true,
          read: true,
          createdAt: true,
          meta: true,
          priority: true,
          deletedAt: true,
        },
      }),
      prisma.notification.count({ where: { ...where, read: false } }),
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
    return res
      .status(500)
      .json({ success: false, message: "Erreur récupération notifications" });
  }
};

// ✅ Récupérer une notification
export const getOne = async (req: Request, res: Response) => {
  try {
    const caller = ensureAuth(req);
    const { id } = IdParam.parse(req.params);

    const n = await prisma.notification.findUnique({ where: { id } });
    if (!n) return res.status(404).json({ success: false, message: "Not found" });
    if (caller.role !== "ADMIN" && n.userId !== caller.id)
      return res.status(403).json({ success: false, message: "Forbidden" });

    return res.json({ success: true, data: n });
  } catch (err: any) {
    console.error("❌ getOne notification error:", err);
    return res.status(500).json({ success: false, message: "Erreur récupération notification" });
  }
};

// ✅ Mettre à jour (versionning)
export const update = async (req: Request, res: Response) => {
  try {
    const caller = ensureAuth(req);
    const { id } = IdParam.parse(req.params);
    const body = UpdateSchema.parse(req.body);

    const n = await prisma.notification.findUnique({ where: { id } });
    if (!n) return res.status(404).json({ success: false, message: "Not found" });
    if (caller.role !== "ADMIN" && n.userId !== caller.id)
      return res.status(403).json({ success: false, message: "Forbidden" });

    await saveVersion(id);

    const updated = await prisma.notification.update({
      where: { id },
      data: body,
    });

    await prisma.auditLog.create({
      data: {
        action: "NOTIFICATION_UPDATED",
        userId: caller.id,
        metadata: { notifId: id },
      },
    });

    emitSocket(updated.userId, "notification.updated", updated);
    return res.json({ success: true, data: updated });
  } catch (err: any) {
    console.error("❌ update notification error:", err);
    return res.status(500).json({ success: false, message: "Erreur mise à jour notification" });
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

    await prisma.notification.update({ where: { id }, data: { read: true, readAt: new Date() } });

    await prisma.auditLog.create({
      data: {
        action: "NOTIFICATION_READ",
        userId: caller.id,
        metadata: {
          notifId: id,
          ip: req.ip,
          ua: req.headers["user-agent"] || null,
        },
      },
    });

    emitSocket(n.userId, "notification.read", { id });
    return res.json({ success: true });
  } catch (err: any) {
    console.error("❌ markRead error:", err);
    return res.status(500).json({ success: false, message: "Erreur lecture notification" });
  }
};

// ✅ Marquer une notification comme non lue (reopen)
export const markUnread = async (req: Request, res: Response) => {
  try {
    const caller = ensureAuth(req);
    const { id } = IdParam.parse(req.params);

    const n = await prisma.notification.findUnique({ where: { id } });
    if (!n) return res.status(404).json({ success: false, message: "Not found" });
    if (caller.role !== "ADMIN" && n.userId !== caller.id)
      return res.status(403).json({ success: false, message: "Forbidden" });

    await prisma.notification.update({ where: { id }, data: { read: false, readAt: null } });

    await prisma.auditLog.create({
      data: { action: "NOTIFICATION_REOPEN", userId: caller.id, metadata: { notifId: id } },
    });

    emitSocket(n.userId, "notification.unread", { id });
    return res.json({ success: true });
  } catch (err: any) {
    console.error("❌ markUnread error:", err);
    return res.status(500).json({ success: false, message: "Erreur reopen notification" });
  }
};

// ✅ Marquer toutes comme lues
export const markAllRead = async (req: Request, res: Response) => {
  try {
    const caller = ensureAuth(req);
    const body = z.object({ userId: z.string().optional() }).parse(req.body);

    const targetUserId =
      body.userId && body.userId !== caller.id
        ? (ensureAdmin(caller.role), body.userId)
        : caller.id;

    const updated = await prisma.notification.updateMany({
      where: { userId: targetUserId, read: false, deletedAt: null },
      data: { read: true, readAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        action: "NOTIFICATION_READ_ALL",
        userId: caller.id,
        metadata: {
          targetUserId,
          count: updated.count,
          ip: req.ip,
          ua: req.headers["user-agent"] || null,
        },
      },
    });

    emitSocket(targetUserId, "notification.read_all", { count: updated.count });
    return res.json({ success: true, updated: updated.count });
  } catch (err: any) {
    console.error("❌ markAllRead error:", err);
    return res.status(500).json({ success: false, message: "Erreur lecture notifications" });
  }
};

// ✅ Supprimer une notification (soft delete)
export const remove = async (req: Request, res: Response) => {
  try {
    const caller = ensureAuth(req);
    const { id } = IdParam.parse(req.params);

    const n = await prisma.notification.findUnique({
      where: { id },
      select: { id: true, userId: true, deletedAt: true },
    });
    if (!n) return res.status(404).json({ success: false, message: "Not found" });
    if (caller.role !== "ADMIN" && n.userId !== caller.id)
      return res.status(403).json({ success: false, message: "Forbidden" });

    await saveVersion(id);

    await prisma.notification.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        action: "NOTIFICATION_REMOVED",
        userId: caller.id,
        metadata: {
          notifId: id,
          targetUserId: n.userId,
          ip: req.ip,
          ua: req.headers["user-agent"] || null,
        },
      },
    });

    emitSocket(n.userId, "notification.deleted", { id });
    return res.json({ success: true, message: "Notification supprimée (soft delete)" });
  } catch (err: any) {
    console.error("❌ remove notification error:", err);
    return res.status(500).json({ success: false, message: "Erreur suppression notification" });
  }
};

// ✅ Restaurer (soft-delete rollback)
export const restore = async (req: Request, res: Response) => {
  try {
    const caller = ensureAuth(req);
    const { id } = IdParam.parse(req.params);

    const n = await prisma.notification.findUnique({ where: { id } });
    if (!n) return res.status(404).json({ success: false, message: "Not found" });
    if (caller.role !== "ADMIN" && n.userId !== caller.id)
      return res.status(403).json({ success: false, message: "Forbidden" });

    await prisma.notification.update({ where: { id }, data: { deletedAt: null } });

    await prisma.auditLog.create({
      data: { action: "NOTIFICATION_RESTORED", userId: caller.id, metadata: { notifId: id } },
    });

    emitSocket(n.userId, "notification.restored", { id });
    return res.json({ success: true, message: "Notification restaurée" });
  } catch (err: any) {
    console.error("❌ restore notification error:", err);
    return res.status(500).json({ success: false, message: "Erreur restauration notification" });
  }
};

// ✅ Rollback depuis une version
export const rollback = async (req: Request, res: Response) => {
  try {
    const caller = ensureAuth(req);
    const { id, versionId } = z.object({ id: z.string(), versionId: z.string() }).parse(req.params);

    const n = await prisma.notification.findUnique({ where: { id } });
    if (!n) return res.status(404).json({ success: false, message: "Not found" });
    if (caller.role !== "ADMIN" && n.userId !== caller.id)
      return res.status(403).json({ success: false, message: "Forbidden" });

    const v = await prisma.notificationVersion.findUnique({ where: { id: versionId } });
    if (!v || v.notificationId !== id)
      return res.status(404).json({ success: false, message: "Version introuvable" });

    await saveVersion(id);

    const restored = await prisma.notification.update({
      where: { id },
      data: {
        title: v.title,
        message: v.message,
        type: v.type as any,
        actionUrl: v.actionUrl,
        meta: v.meta,
        priority: (v as any).priority || "normal",
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "NOTIFICATION_ROLLBACK",
        userId: caller.id,
        metadata: { notifId: id, versionId },
      },
    });

    emitSocket(n.userId, "notification.updated", restored);
    return res.json({ success: true, data: restored });
  } catch (err: any) {
    console.error("❌ rollback notification error:", err);
    return res.status(500).json({ success: false, message: "Erreur rollback notification" });
  }
};

// ✅ Snooze
export const snooze = async (req: Request, res: Response) => {
  try {
    const caller = ensureAuth(req);
    const { id } = IdParam.parse(req.params);
    const { until, reason } = SnoozeSchema.parse(req.body);

    const n = await prisma.notification.findUnique({ where: { id } });
    if (!n) return res.status(404).json({ success: false, message: "Not found" });
    if (caller.role !== "ADMIN" && n.userId !== caller.id)
      return res.status(403).json({ success: false, message: "Forbidden" });

    await prisma.notification.update({
      where: { id },
      data: { snoozedUntil: until, snoozeReason: reason || null },
    });

    await prisma.auditLog.create({
      data: {
        action: "NOTIFICATION_SNOOZE",
        userId: caller.id,
        metadata: { notifId: id, until, reason },
      },
    });

    emitSocket(n.userId, "notification.snoozed", { id, until });
    return res.json({ success: true });
  } catch (err: any) {
    console.error("❌ snooze error:", err);
    return res.status(500).json({ success: false, message: "Erreur snooze" });
  }
};

// ✅ Ack (acknowledge rapide)
export const acknowledge = async (req: Request, res: Response) => {
  try {
    const caller = ensureAuth(req);
    const { id } = IdParam.parse(req.params);

    const n = await prisma.notification.findUnique({ where: { id } });
    if (!n) return res.status(404).json({ success: false, message: "Not found" });
    if (caller.role !== "ADMIN" && n.userId !== caller.id)
      return res.status(403).json({ success: false, message: "Forbidden" });

    await prisma.notification.update({
      where: { id },
      data: { read: true, readAt: new Date(), acknowledgedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: { action: "NOTIFICATION_ACK", userId: caller.id, metadata: { notifId: id } },
    });

    emitSocket(n.userId, "notification.ack", { id });
    return res.json({ success: true });
  } catch (err: any) {
    console.error("❌ acknowledge error:", err);
    return res.status(500).json({ success: false, message: "Erreur acknowledge" });
  }
};

/* ============================================================================
 *  BULK OPS
 * ========================================================================== */

// ✅ Bulk read
export const bulkRead = async (req: Request, res: Response) => {
  try {
    const caller = ensureAuth(req);
    const { ids } = BulkIdsSchema.parse(req.body);

    const updated = await prisma.notification.updateMany({
      where: {
        id: { in: ids },
        OR: [{ userId: caller.id }, ...(caller.role === "ADMIN" ? [{}] : [])],
        deletedAt: null,
        read: false,
      },
      data: { read: true, readAt: new Date() },
    });

    await prisma.auditLog.create({
      data: { action: "NOTIFICATION_BULK_READ", userId: caller.id, metadata: { count: updated.count } },
    });

    emitSocket(caller.id, "notification.bulk_read", { count: updated.count });
    return res.json({ success: true, count: updated.count });
  } catch (err: any) {
    console.error("❌ bulkRead error:", err);
    return res.status(500).json({ success: false, message: "Erreur bulk read" });
  }
};

// ✅ Bulk delete (soft)
export const bulkDelete = async (req: Request, res: Response) => {
  try {
    const caller = ensureAuth(req);
    const { ids } = BulkIdsSchema.parse(req.body);

    // Versionning de toutes avant suppression
    await Promise.all(ids.map((id) => saveVersion(id)));

    const updated = await prisma.notification.updateMany({
      where: {
        id: { in: ids },
        OR: [{ userId: caller.id }, ...(caller.role === "ADMIN" ? [{}] : [])],
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: { action: "NOTIFICATION_BULK_DELETE", userId: caller.id, metadata: { count: updated.count } },
    });

    emitSocket(caller.id, "notification.bulk_deleted", { count: updated.count });
    return res.json({ success: true, count: updated.count });
  } catch (err: any) {
    console.error("❌ bulkDelete error:", err);
    return res.status(500).json({ success: false, message: "Erreur bulk delete" });
  }
};

/* ============================================================================
 *  EXPORTS (JSON / CSV / Markdown / PDF)
 * ========================================================================== */

// ✅ Export perso
export const exportMyNotifications = async (req: Request, res: Response) => {
  try {
    const caller = ensureAuth(req);
    const format = (req.query.format as string) || "json";

    const rows = await prisma.notification.findMany({
      where: { userId: caller.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });

    if (format === "json") {
      res.setHeader("Content-Disposition", `attachment; filename=notifications.json`);
      return res.json(rows);
    }
    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=notifications.csv`);
      return res.send(toCSV(rows));
    }
    if (format === "md") {
      res.setHeader("Content-Type", "text/markdown");
      res.setHeader("Content-Disposition", `attachment; filename=notifications.md`);
      return res.send(toMarkdown(rows));
    }
    if (format === "pdf") {
      return writePDF(res, rows);
    }
    return res.status(400).json({ success: false, message: "Format non supporté" });
  } catch (err: any) {
    console.error("❌ exportMyNotifications error:", err);
    return res.status(500).json({ success: false, message: "Erreur export" });
  }
};

// ✅ Export admin global
export const exportAll = async (req: Request, res: Response) => {
  try {
    const caller = ensureAuth(req);
    ensureAdmin(caller.role);
    const format = (req.query.format as string) || "json";

    const rows = await prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
    });

    if (format === "json") {
      res.setHeader("Content-Disposition", `attachment; filename=notifications-all.json`);
      return res.json(rows);
    }
    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=notifications-all.csv`);
      return res.send(toCSV(rows));
    }
    if (format === "md") {
      res.setHeader("Content-Type", "text/markdown");
      res.setHeader("Content-Disposition", `attachment; filename=notifications-all.md`);
      return res.send(toMarkdown(rows));
    }
    if (format === "pdf") {
      return writePDF(res, rows);
    }
    return res.status(400).json({ success: false, message: "Format non supporté" });
  } catch (err: any) {
    console.error("❌ exportAll error:", err);
    return res.status(500).json({ success: false, message: "Erreur export admin" });
  }
};

/* ============================================================================
 *  STATS
 * ========================================================================== */

// ✅ Stats perso
export const myStats = async (req: Request, res: Response) => {
  try {
    const caller = ensureAuth(req);

    const [total, unread, byType, byPriority, last7d] = await Promise.all([
      prisma.notification.count({ where: { userId: caller.id, deletedAt: null } }),
      prisma.notification.count({ where: { userId: caller.id, read: false, deletedAt: null } }),
      prisma.$queryRawUnsafe<{ type: string; count: number }[]>(
        `SELECT "type"::text as type, COUNT(*)::int as count
         FROM "Notification" WHERE "userId"=$1 AND "deletedAt" IS NULL
         GROUP BY "type"`, caller.id
      ),
      prisma.$queryRawUnsafe<{ priority: string; count: number }[]>(
        `SELECT COALESCE("priority",'normal') as priority, COUNT(*)::int as count
         FROM "Notification" WHERE "userId"=$1 AND "deletedAt" IS NULL
         GROUP BY "priority"`, caller.id
      ),
      prisma.$queryRawUnsafe<{ day: string; count: number }[]>(
        `SELECT DATE("createdAt")::text as day, COUNT(*)::int as count
         FROM "Notification" WHERE "userId"=$1 AND "deletedAt" IS NULL
           AND "createdAt" >= NOW() - INTERVAL '7 days'
         GROUP BY day ORDER BY day ASC`, caller.id
      ),
    ]);

    return res.json({
      success: true,
      data: {
        total,
        unread,
        byType,
        byPriority,
        last7d,
      },
    });
  } catch (err: any) {
    console.error("❌ myStats error:", err);
    return res.status(500).json({ success: false, message: "Erreur stats" });
  }
};

// ✅ Stats admin globales
export const globalStats = async (req: Request, res: Response) => {
  try {
    const caller = ensureAuth(req);
    ensureAdmin(caller.role);

    const [total, unread, byType, byPriority, topUsers] = await Promise.all([
      prisma.notification.count(),
      prisma.notification.count({ where: { read: false, deletedAt: null } }),
      prisma.$queryRawUnsafe<{ type: string; count: number }[]>(
        `SELECT "type"::text as type, COUNT(*)::int as count
         FROM "Notification" GROUP BY "type"`
      ),
      prisma.$queryRawUnsafe<{ priority: string; count: number }[]>(
        `SELECT COALESCE("priority",'normal') as priority, COUNT(*)::int as count
         FROM "Notification" GROUP BY "priority"`
      ),
      prisma.$queryRawUnsafe<{ userId: string; count: number }[]>(
        `SELECT "userId", COUNT(*)::int as count
         FROM "Notification" GROUP BY "userId" ORDER BY count DESC LIMIT 10`
      ),
    ]);

    return res.json({
      success: true,
      data: { total, unread, byType, byPriority, topUsers },
    });
  } catch (err: any) {
    console.error("❌ globalStats error:", err);
    return res.status(500).json({ success: false, message: "Erreur stats globales" });
  }
};

/* ============================================================================
 *  SSE – STREAM TEMPS RÉEL (fallback si pas de socket sur le client)
 * ========================================================================== */
export const stream = async (req: Request, res: Response) => {
  try {
    const caller = ensureAuth(req);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const send = (event: string, payload: any) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${typeof payload === "string" ? payload : JSON.stringify(payload)}\n\n`);
    };

    // heartbeat
    const hb = setInterval(() => send("heartbeat", Date.now()), 15000);

    // première charge (unread)
    const unread = await prisma.notification.count({ where: { userId: caller.id, read: false, deletedAt: null } });
    send("hello", { unread });

    // Si socket.io existe côté serveur, on peut coller un listener ad-hoc
    const room = caller.id;
    const handler = (payload: any) => send("notification", payload);
    try {
      io?.to?.(room)?.on?.("notification", handler);
    } catch {}

    req.on("close", () => {
      clearInterval(hb);
      try { io?.to?.(room)?.off?.("notification", handler); } catch {}
      res.end();
    });
  } catch (err: any) {
    console.error("❌ stream notifications error:", err);
    res.status(500).end();
  }
};

/* ============================================================================
 *  SCHEDULING – planifier / lister / force-run / annuler (si pas de queue)
 * ========================================================================== */
export const schedule = async (req: Request, res: Response) => {
  try {
    const caller = ensureAuth(req);
    ensureAdmin(caller.role);
    const payload = ScheduleSchema.parse(req.body);

    // prefer queue if available
    if (notificationQueue?.add) {
      await notificationQueue.add("scheduled-notif", {
        payload: { ...payload, createdById: caller.id },
      }, { delay: Math.max(0, payload.when.getTime() - Date.now()) });
      await prisma.auditLog.create({
        data: {
          action: "NOTIFICATION_SCHEDULE_QUEUED",
          userId: caller.id,
          metadata: { when: payload.when, broadcast: !!payload.broadcast },
        },
      });
      return res.status(202).json({ success: true, queued: true });
    }

    // fallback DB record
    const rec = await prisma.scheduledNotification.create({
      data: {
        title: payload.title,
        message: payload.message,
        type: payload.type,
        actionUrl: payload.actionUrl || null,
        meta: payload.meta || {},
        userId: payload.userId || null,
        broadcast: !!payload.broadcast,
        priority: payload.priority || "normal",
        scheduledAt: payload.when,
        dedupKey: payload.dedupKey || null,
        createdById: caller.id,
        status: "SCHEDULED",
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "NOTIFICATION_SCHEDULED",
        userId: caller.id,
        metadata: { id: rec.id, when: payload.when },
      },
    });

    return res.status(201).json({ success: true, data: rec });
  } catch (err: any) {
    console.error("❌ schedule error:", err);
    return res.status(500).json({ success: false, message: "Erreur scheduling" });
  }
};

export const listScheduled = async (req: Request, res: Response) => {
  try {
    const caller = ensureAuth(req);
    ensureAdmin(caller.role);
    const rows = await prisma.scheduledNotification.findMany({
      orderBy: { scheduledAt: "asc" },
    });
    return res.json({ success: true, data: rows });
  } catch (err: any) {
    console.error("❌ listScheduled error:", err);
    return res.status(500).json({ success: false, message: "Erreur list scheduled" });
  }
};

export const cancelScheduled = async (req: Request, res: Response) => {
  try {
    const caller = ensureAuth(req);
    ensureAdmin(caller.role);
    const { id } = IdParam.parse(req.params);

    const s = await prisma.scheduledNotification.findUnique({ where: { id } });
    if (!s) return res.status(404).json({ success: false, message: "Not found" });

    await prisma.scheduledNotification.update({ where: { id }, data: { status: "CANCELLED" } });
    await prisma.auditLog.create({
      data: { action: "NOTIFICATION_SCHEDULE_CANCELLED", userId: caller.id, metadata: { id } },
    });
    return res.json({ success: true });
  } catch (err: any) {
    console.error("❌ cancelScheduled error:", err);
    return res.status(500).json({ success: false, message: "Erreur cancel scheduled" });
  }
};

export const runScheduledNow = async (req: Request, res: Response) => {
  try {
    const caller = ensureAuth(req);
    ensureAdmin(caller.role);
    const { id } = IdParam.parse(req.params);

    const s = await prisma.scheduledNotification.findUnique({ where: { id } });
    if (!s) return res.status(404).json({ success: false, message: "Not found" });
    if (s.status !== "SCHEDULED") return res.status(400).json({ success: false, message: "Invalid state" });

    // exécuter maintenant
    if (s.broadcast) {
      const users = await prisma.user.findMany({ select: { id: true } });
      await prisma.$transaction(
        users.map((u) =>
          prisma.notification.create({
            data: {
              userId: u.id,
              title: s.title,
              message: s.message,
              type: s.type as any,
              actionUrl: s.actionUrl,
              meta: s.meta || {},
              priority: (s as any).priority || "normal",
              dedupKey: s.dedupKey || null,
            },
          })
        )
      );
      users.forEach((u) => emitSocket(u.id, "notification", { title: s.title, message: s.message }));
    } else if (s.userId) {
      const notif = await prisma.notification.create({
        data: {
          userId: s.userId,
          title: s.title,
          message: s.message,
          type: s.type as any,
          actionUrl: s.actionUrl,
          meta: s.meta || {},
          priority: (s as any).priority || "normal",
          dedupKey: s.dedupKey || null,
        },
      });
      emitSocket(s.userId, "notification", notif);
    }

    await prisma.scheduledNotification.update({ where: { id }, data: { status: "EXECUTED", executedAt: new Date() } });
    await prisma.auditLog.create({
      data: { action: "NOTIFICATION_SCHEDULE_EXECUTED", userId: caller.id, metadata: { id } },
    });

    return res.json({ success: true });
  } catch (err: any) {
    console.error("❌ runScheduledNow error:", err);
    return res.status(500).json({ success: false, message: "Erreur run now" });
  }
};

/* ============================================================================
 *  TEMPLATES (CRUD) – réutilisables pour NotifySchema.templateId
 * ========================================================================== */
export const upsertTemplate = async (req: Request, res: Response) => {
  try {
    const caller = ensureAuth(req);
    ensureAdmin(caller.role);
    const body = TemplateUpsertSchema.parse(req.body);

    const tpl = await prisma.notificationTemplate.upsert({
      where: { code: body.code },
      update: {
        title: body.title,
        body: body.body,
        type: body.type as any,
        defaults: body.defaults || {},
        description: body.description || null,
      },
      create: {
        code: body.code,
        title: body.title,
        body: body.body,
        type: body.type as any,
        defaults: body.defaults || {},
        description: body.description || null,
        createdById: caller.id,
      },
    });

    await prisma.auditLog.create({
      data: { action: "NOTIF_TEMPLATE_UPSERT", userId: caller.id, metadata: { code: body.code, id: tpl.id } },
    });

    return res.status(201).json({ success: true, data: tpl });
  } catch (err: any) {
    console.error("❌ upsertTemplate error:", err);
    return res.status(500).json({ success: false, message: "Erreur template upsert" });
  }
};

export const listTemplates = async (req: Request, res: Response) => {
  try {
    const caller = ensureAuth(req);
    ensureAdmin(caller.role);
    const rows = await prisma.notificationTemplate.findMany({
      orderBy: { createdAt: "desc" },
    });
    return res.json({ success: true, data: rows });
  } catch (err: any) {
    console.error("❌ listTemplates error:", err);
    return res.status(500).json({ success: false, message: "Erreur list templates" });
  }
};

export const deleteTemplate = async (req: Request, res: Response) => {
  try {
    const caller = ensureAuth(req);
    ensureAdmin(caller.role);
    const { id } = IdParam.parse(req.params);

    await prisma.notificationTemplate.delete({ where: { id } });
    await prisma.auditLog.create({
      data: { action: "NOTIF_TEMPLATE_DELETE", userId: caller.id, metadata: { id } },
    });

    return res.json({ success: true, message: "Template supprimé" });
  } catch (err: any) {
    console.error("❌ deleteTemplate error:", err);
    return res.status(500).json({ success: false, message: "Erreur delete template" });
  }
};

/* ============================================================================
 *  ADMIN UTILITIES – purge / hard delete / versions
 * ========================================================================== */

// ✅ versions d’une notification
export const versions = async (req: Request, res: Response) => {
  try {
    const caller = ensureAuth(req);
    const { id } = IdParam.parse(req.params);
    if (caller.role !== "ADMIN") return res.status(403).json({ success: false, message: "Forbidden" });

    const rows = await prisma.notificationVersion.findMany({
      where: { notificationId: id },
      orderBy: { createdAt: "desc" },
    });
    return res.json({ success: true, data: rows });
  } catch (err: any) {
    console.error("❌ versions error:", err);
    return res.status(500).json({ success: false, message: "Erreur versions" });
  }
};

// ✅ purge anciennes notifications (admin)
export const purge = async (req: Request, res: Response) => {
  try {
    const caller = ensureAuth(req);
    ensureAdmin(caller.role);
    const { olderThanDays = 180 } = (req.query || {}) as any;

    const date = new Date(Date.now() - Number(olderThanDays) * 24 * 3600 * 1000);
    const purged = await prisma.notification.updateMany({
      where: { createdAt: { lt: date } },
      data: { deletedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: { action: "NOTIFICATION_PURGE", userId: caller.id, metadata: { olderThanDays } },
    });

    return res.json({ success: true, purged: purged.count });
  } catch (err: any) {
    console.error("❌ purge error:", err);
    return res.status(500).json({ success: false, message: "Erreur purge" });
  }
};

// ✅ hard delete (admin)
export const hardDelete = async (req: Request, res: Response) => {
  try {
    const caller = ensureAuth(req);
    ensureAdmin(caller.role);
    const { id } = IdParam.parse(req.params);

    await prisma.notification.delete({ where: { id } });
    await prisma.auditLog.create({
      data: { action: "NOTIFICATION_HARD_DELETE", userId: caller.id, metadata: { id } },
    });

    return res.json({ success: true, message: "Notification supprimée (hard)" });
  } catch (err: any) {
    console.error("❌ hardDelete error:", err);
    return res.status(500).json({ success: false, message: "Erreur hard delete" });
  }
};
