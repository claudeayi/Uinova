// src/controllers/admin/usersAdminController.ts
import { Request, Response } from "express";
import { prisma } from "../../utils/prisma";
import { z } from "zod";

/* ============================================================================
 * VALIDATION
 * ========================================================================== */
const UpdateUserSchema = z.object({
  email: z.string().email().optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
  suspended: z.boolean().optional(),
});

const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  role: z.enum(["USER", "ADMIN"]).optional(),
  suspended: z.coerce.boolean().optional(),
  search: z.string().optional(),
  sort: z.enum(["createdAt:desc", "createdAt:asc"]).default("createdAt:desc"),
  since: z.coerce.date().optional(),
  until: z.coerce.date().optional(),
});

const BulkIdsSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

/* ============================================================================
 * HELPERS
 * ========================================================================== */
function ensureAdmin(req: Request) {
  const role = (req as any)?.user?.role;
  if (role !== "ADMIN") {
    const err: any = new Error("Forbidden");
    err.status = 403;
    throw err;
  }
}
async function auditLog(userId: string, action: string, metadata: any = {}) {
  try {
    await prisma.auditLog.create({ data: { userId, action, metadata } });
  } catch (err) {
    console.warn("⚠️ auditLog failed:", err);
  }
}
async function saveVersion(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u) return;
  await prisma.userVersion.create({
    data: {
      userId: u.id,
      email: u.email,
      role: u.role,
      suspended: u.suspended,
      createdAt: new Date(),
    },
  });
}

/* ============================================================================
 * CONTROLLERS
 * ========================================================================== */

// 📋 Liste tous les utilisateurs (avec filtres & pagination)
export async function listUsers(req: Request, res: Response) {
  try {
    ensureAdmin(req);
    const q = ListQuerySchema.parse(req.query);
    const { page, pageSize, role, suspended, search, sort, since, until } = q;

    const where: any = {};
    if (role) where.role = role;
    if (suspended !== undefined) where.suspended = suspended;
    if (search) where.email = { contains: search, mode: "insensitive" };
    if (since || until) {
      where.createdAt = {};
      if (since) where.createdAt.gte = since;
      if (until) where.createdAt.lte = until;
    }

    const [sortField, sortDir] = sort.split(":") as ["createdAt", "asc" | "desc"];
    const orderBy: any = { [sortField]: sortDir };

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: { id: true, email: true, role: true, createdAt: true, suspended: true },
      }),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    console.error("❌ listUsers error:", err);
    res.status(500).json({ success: false, message: "Erreur récupération utilisateurs" });
  }
}

// 🔎 Détail d’un utilisateur
export async function getUserById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true, createdAt: true, suspended: true },
    });
    if (!user) return res.status(404).json({ success: false, message: "Utilisateur introuvable" });

    res.json({ success: true, data: user });
  } catch (err) {
    console.error("❌ getUserById error:", err);
    res.status(500).json({ success: false, message: "Erreur récupération utilisateur" });
  }
}

// ✏️ Mise à jour d’un utilisateur (avec versionning)
export async function updateUser(req: Request, res: Response) {
  try {
    ensureAdmin(req);
    const { id } = req.params;
    const body = UpdateUserSchema.parse(req.body);

    await saveVersion(id);
    const updated = await prisma.user.update({
      where: { id },
      data: body,
      select: { id: true, email: true, role: true, suspended: true, updatedAt: true },
    });

    await auditLog((req as any).user?.id, "ADMIN_USER_UPDATE", { targetUserId: id, body });
    res.json({ success: true, data: updated });
  } catch (err: any) {
    console.error("❌ updateUser error:", err);
    if (err?.code === "P2002") return res.status(409).json({ success: false, message: "Email déjà utilisé" });
    if (err?.code === "P2025") return res.status(404).json({ success: false, message: "Utilisateur introuvable" });
    res.status(500).json({ success: false, message: "Erreur mise à jour utilisateur" });
  }
}

// 🗑️ Suppression (soft delete + restore)
export async function deleteUser(req: Request, res: Response) {
  try {
    ensureAdmin(req);
    const { id } = req.params;

    await saveVersion(id);
    await prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
    await auditLog((req as any).user?.id, "ADMIN_USER_DELETE", { targetUserId: id });

    res.json({ success: true, message: `Utilisateur ${id} archivé (soft delete)` });
  } catch (err: any) {
    console.error("❌ deleteUser error:", err);
    if (err?.code === "P2025") return res.status(404).json({ success: false, message: "Utilisateur introuvable" });
    res.status(500).json({ success: false, message: "Erreur suppression utilisateur" });
  }
}

export async function restoreUser(req: Request, res: Response) {
  try {
    ensureAdmin(req);
    const { id } = req.params;
    const user = await prisma.user.update({
      where: { id },
      data: { deletedAt: null },
      select: { id: true, email: true, role: true, suspended: true },
    });
    await auditLog((req as any).user?.id, "ADMIN_USER_RESTORE", { targetUserId: id });
    res.json({ success: true, data: user });
  } catch (err) {
    console.error("❌ restoreUser error:", err);
    res.status(500).json({ success: false, message: "Erreur restauration utilisateur" });
  }
}

// 🚫 Suspension / réactivation
export async function suspendUser(req: Request, res: Response) {
  try {
    ensureAdmin(req);
    const { id } = req.params;
    const { suspended } = z.object({ suspended: z.boolean() }).parse(req.body);

    await saveVersion(id);
    const user = await prisma.user.update({
      where: { id },
      data: { suspended },
      select: { id: true, email: true, suspended: true, updatedAt: true },
    });

    await auditLog((req as any).user?.id, "ADMIN_USER_SUSPEND", { targetUserId: id, suspended });
    res.json({ success: true, data: user });
  } catch (err: any) {
    console.error("❌ suspendUser error:", err);
    if (err?.code === "P2025") return res.status(404).json({ success: false, message: "Utilisateur introuvable" });
    res.status(500).json({ success: false, message: "Erreur suspension utilisateur" });
  }
}

// 📊 Statistiques utilisateurs (avancées)
export async function userStats(_req: Request, res: Response) {
  try {
    const [total, suspended, active, byRole, last7d] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { suspended: true } }),
      prisma.user.count({ where: { suspended: false } }),
      prisma.user.groupBy({ by: ["role"], _count: { role: true } }),
      prisma.user.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) } } }),
    ]);

    res.json({ success: true, data: { total, active, suspended, byRole, last7d } });
  } catch (err) {
    console.error("❌ userStats error:", err);
    res.status(500).json({ success: false, message: "Erreur récupération stats utilisateurs" });
  }
}

// 📤 Export des utilisateurs
export async function exportUsers(req: Request, res: Response) {
  try {
    ensureAdmin(req);
    const format = (req.query.format as string) || "json";
    const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });

    if (format === "json") return res.json(users);
    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv");
      res.send(users.map(u => `${u.id},${u.email},${u.role},${u.suspended}`).join("\n"));
      return;
    }
    if (format === "md") {
      res.type("markdown").send(users.map(u => `- ${u.email} (${u.role})`).join("\n"));
      return;
    }
    res.status(400).json({ success: false, message: "Format non supporté" });
  } catch (err) {
    console.error("❌ exportUsers error:", err);
    res.status(500).json({ success: false, message: "Erreur export utilisateurs" });
  }
}

// 🛠️ Bulk actions
export async function bulkSuspend(req: Request, res: Response) {
  try {
    ensureAdmin(req);
    const { ids } = BulkIdsSchema.parse(req.body);
    const result = await prisma.user.updateMany({ where: { id: { in: ids } }, data: { suspended: true } });
    await auditLog((req as any).user?.id, "ADMIN_USER_BULK_SUSPEND", { ids });
    res.json({ success: true, count: result.count });
  } catch (err) {
    console.error("❌ bulkSuspend error:", err);
    res.status(500).json({ success: false, message: "Erreur bulk suspend" });
  }
}

export async function bulkDelete(req: Request, res: Response) {
  try {
    ensureAdmin(req);
    const { ids } = BulkIdsSchema.parse(req.body);
    const result = await prisma.user.updateMany({ where: { id: { in: ids } }, data: { deletedAt: new Date() } });
    await auditLog((req as any).user?.id, "ADMIN_USER_BULK_DELETE", { ids });
    res.json({ success: true, count: result.count });
  } catch (err) {
    console.error("❌ bulkDelete error:", err);
    res.status(500).json({ success: false, message: "Erreur bulk delete" });
  }
}
