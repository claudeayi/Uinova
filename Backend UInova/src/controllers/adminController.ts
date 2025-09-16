// src/controllers/AdminController.ts
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import { emitEvent } from "../services/eventBus";

/* ============================================================================
 * VALIDATION SCHEMAS
 * ========================================================================== */
const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Mot de passe trop court (min 8 caractères)"),
  displayName: z.string().min(2).max(80).optional(),
  role: z.enum(["USER", "ADMIN", "SUPERADMIN"]).optional().default("USER"),
});

const UpdateUserSchema = z.object({
  email: z.string().email().optional(),
  displayName: z.string().min(2).max(80).optional(),
  role: z.enum(["USER", "ADMIN", "SUPERADMIN"]).optional(),
  password: z.string().min(8).optional(),
});

const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
  q: z.string().trim().optional(),
  role: z.enum(["USER", "ADMIN", "SUPERADMIN"]).optional(),
  sort: z
    .enum(["createdAt:asc", "createdAt:desc", "email:asc", "email:desc"])
    .default("createdAt:desc"),
});

/* ============================================================================
 * HELPERS
 * ========================================================================== */
function ensureAdmin(req: Request) {
  const role = (req as any)?.user?.role;
  if (!role || !["ADMIN", "SUPERADMIN"].includes(role)) {
    const err: any = new Error("Forbidden");
    err.status = 403;
    throw err;
  }
}

async function auditLog(userId: string, action: string, metadata: any = {}, req?: Request) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        metadata: {
          ...metadata,
          ip: req?.ip,
          ua: req?.headers["user-agent"],
        },
      },
    });
  } catch (err) {
    console.warn("⚠️ Audit log failed:", err);
  }
}

/* ============================================================================
 * CONTROLLERS
 * ========================================================================== */

// ✅ GET /api/admin/users
export const listUsers = async (req: Request, res: Response) => {
  ensureAdmin(req);
  const { page, pageSize, q, role, sort } = ListQuerySchema.parse(req.query);

  const where: any = {};
  if (role) where.role = role;
  if (q) {
    where.OR = [
      { email: { contains: q, mode: "insensitive" } },
      { displayName: { contains: q, mode: "insensitive" } },
    ];
  }

  const [sortField, sortDir] = sort.split(":") as ["createdAt" | "email", "asc" | "desc"];
  const orderBy: any = { [sortField]: sortDir };

  const [total, items] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  return res.json({
    success: true,
    data: { items, page, pageSize, total, totalPages: Math.ceil(total / pageSize) || 1 },
  });
};

// ✅ GET /api/admin/users/:id
export const getUser = async (req: Request, res: Response) => {
  ensureAdmin(req);
  const { id } = req.params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, displayName: true, role: true, createdAt: true, updatedAt: true },
  });

  if (!user) return res.status(404).json({ success: false, error: "User not found" });
  return res.json({ success: true, data: user });
};

// ✅ POST /api/admin/users
export const createUser = async (req: Request, res: Response) => {
  ensureAdmin(req);
  const body = CreateUserSchema.parse(req.body);

  const exists = await prisma.user.findUnique({ where: { email: body.email } });
  if (exists) return res.status(409).json({ success: false, error: "Email already in use" });

  const passwordHash = await bcrypt.hash(body.password, 12);

  const user = await prisma.user.create({
    data: {
      email: body.email,
      passwordHash,
      displayName: body.displayName ?? null,
      role: body.role,
    },
    select: { id: true, email: true, displayName: true, role: true, createdAt: true, updatedAt: true },
  });

  await auditLog((req as any).user?.id, "ADMIN_USER_CREATE", { targetUserId: user.id }, req);
  emitEvent("admin.user.created", { user });

  return res.status(201).json({ success: true, data: user });
};

// ✅ PUT /api/admin/users/:id
export const updateUser = async (req: Request, res: Response) => {
  ensureAdmin(req);
  const { id } = req.params;
  const body = UpdateUserSchema.parse(req.body);

  const data: any = {};
  if (body.email) data.email = body.email;
  if (body.displayName !== undefined) data.displayName = body.displayName;
  if (body.role) data.role = body.role;
  if (body.password) data.passwordHash = await bcrypt.hash(body.password, 12);

  try {
    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, displayName: true, role: true, createdAt: true, updatedAt: true },
    });

    await auditLog((req as any).user?.id, "ADMIN_USER_UPDATE", { targetUserId: id }, req);
    emitEvent("admin.user.updated", { userId: id });

    return res.json({ success: true, data: updated });
  } catch (e: any) {
    if (e?.code === "P2002") return res.status(409).json({ success: false, error: "Email already in use" });
    if (e?.code === "P2025") return res.status(404).json({ success: false, error: "User not found" });
    throw e;
  }
};

// ✅ DELETE /api/admin/users/:id
export const deleteUser = async (req: Request, res: Response) => {
  ensureAdmin(req);
  const { id } = req.params;

  try {
    // Soft delete : marquer comme "DISABLED"
    const deleted = await prisma.user.update({
      where: { id },
      data: { active: false },
    });

    await auditLog((req as any).user?.id, "ADMIN_USER_DELETE", { targetUserId: id }, req);
    emitEvent("admin.user.deleted", { userId: id });

    return res.json({ success: true, message: "User disabled", data: deleted });
  } catch (e: any) {
    if (e?.code === "P2025") return res.status(404).json({ success: false, error: "User not found" });
    throw e;
  }
};

// ✅ GET /api/admin/users/stats
export const userStats = async (req: Request, res: Response) => {
  ensureAdmin(req);

  const [total, admins, users, last7d, perDay] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.user.count({ where: { role: "USER" } }),
    prisma.user.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) } } }),
    prisma.$queryRawUnsafe<{ day: string; count: number }[]>(`
      SELECT DATE("createdAt") as day, COUNT(*)::int as count
      FROM "User"
      WHERE "createdAt" >= NOW() - INTERVAL '30 days'
      GROUP BY day
      ORDER BY day ASC
    `),
  ]);

  const growthRate =
    perDay.length > 1
      ? ((perDay[perDay.length - 1].count - perDay[0].count) / perDay[0].count) * 100
      : 0;

  return res.json({
    success: true,
    data: {
      total,
      byRole: { ADMIN: admins, USER: users },
      newLast7d: last7d,
      trend30d: perDay,
      growthRate,
    },
  });
};
