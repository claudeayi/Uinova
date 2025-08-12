// src/controllers/AdminController.ts
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../utils/prisma";

/**
 * Helpers / validation
 */
const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().min(2).max(80).optional(),
  role: z.enum(["USER", "ADMIN"]).optional().default("USER"),
});

const UpdateUserSchema = z.object({
  email: z.string().email().optional(),          // autorise la MAJ d'email si nécessaire
  displayName: z.string().min(2).max(80).optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
  password: z.string().min(6).optional(),        // si présent => réinitialisation
});

const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
  q: z.string().trim().optional(),               // recherche email/displayName
  role: z.enum(["USER", "ADMIN"]).optional(),
  sort: z
    .enum(["createdAt:asc","createdAt:desc","email:asc","email:desc"])
    .optional()
    .default("createdAt:desc"),
});

/**
 * Assure que l'appelant est ADMIN (tu peux aussi faire ça dans un middleware global).
 */
function ensureAdmin(req: Request) {
  const role = (req as any)?.user?.role; // supposé injecté par ton middleware auth
  if (role !== "ADMIN") {
    const err: any = new Error("Forbidden");
    err.status = 403;
    throw err;
  }
}

/**
 * GET /api/admin/users
 * Query: page, pageSize, q, role, sort
 * Réponse: { items, page, pageSize, total, totalPages }
 */
export const listUsers = async (req: Request, res: Response) => {
  ensureAdmin(req);
  const { page, pageSize, q, role, sort } = ListQuerySchema.parse(req.query);

  // Filtre
  const where: any = {};
  if (role) where.role = role;
  if (q) {
    where.OR = [
      { email: { contains: q, mode: "insensitive" } },
      { displayName: { contains: q, mode: "insensitive" } },
    ];
  }

  // Tri
  const [sortField, sortDir] = sort.split(":") as ["createdAt" | "email", "asc" | "desc"];
  const orderBy: any = { [sortField]: sortDir };

  const [total, items] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, email: true, displayName: true, role: true, createdAt: true, updatedAt: true },
    }),
  ]);

  const totalPages = Math.ceil(total / pageSize) || 1;
  res.json({ items, page, pageSize, total, totalPages });
};

/**
 * GET /api/admin/users/:id
 */
export const getUser = async (req: Request, res: Response) => {
  ensureAdmin(req);
  const { id } = req.params;
  const user = await prisma.user.findUnique({
    where: { id }, // si id numérique: { id: Number(id) }
    select: { id: true, email: true, displayName: true, role: true, createdAt: true, updatedAt: true },
  });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
};

/**
 * POST /api/admin/users
 * Body: { email, password, displayName?, role? }
 */
export const createUser = async (req: Request, res: Response) => {
  ensureAdmin(req);
  const body = CreateUserSchema.parse(req.body);

  // Unicité email
  const exists = await prisma.user.findUnique({ where: { email: body.email } });
  if (exists) return res.status(409).json({ error: "Email already in use" });

  const passwordHash = await bcrypt.hash(body.password, 10);

  const user = await prisma.user.create({
    data: {
      email: body.email,
      passwordHash,
      displayName: body.displayName ?? null,
      role: body.role,
    },
    select: { id: true, email: true, displayName: true, role: true, createdAt: true, updatedAt: true },
  });

  res.status(201).json(user);
};

/**
 * PUT /api/admin/users/:id
 * Body: { email?, displayName?, role?, password? }
 */
export const updateUser = async (req: Request, res: Response) => {
  ensureAdmin(req);
  const { id } = req.params;
  const body = UpdateUserSchema.parse(req.body);

  const data: any = {};
  if (body.email) data.email = body.email;
  if (body.displayName !== undefined) data.displayName = body.displayName;
  if (body.role) data.role = body.role;
  if (body.password) data.passwordHash = await bcrypt.hash(body.password, 10);

  try {
    const updated = await prisma.user.update({
      where: { id }, // si id numérique: { id: Number(id) }
      data,
      select: { id: true, email: true, displayName: true, role: true, createdAt: true, updatedAt: true },
    });
    res.json(updated);
  } catch (e: any) {
    // Gestion collision email unique
    if (e?.code === "P2002") return res.status(409).json({ error: "Email already in use" });
    if (e?.code === "P2025") return res.status(404).json({ error: "User not found" });
    throw e;
  }
};

/**
 * DELETE /api/admin/users/:id
 * Suppression définitive de l’utilisateur (respecte les onDelete Prisma).
 */
export const deleteUser = async (req: Request, res: Response) => {
  ensureAdmin(req);
  const { id } = req.params;

  try {
    await prisma.user.delete({ where: { id } }); // si id numérique: { id: Number(id) }
    res.json({ message: "User deleted" });
  } catch (e: any) {
    if (e?.code === "P2025") return res.status(404).json({ error: "User not found" });
    throw e;
  }
};

/**
 * GET /api/admin/users/stats
 * Petites métriques utiles au tableau de bord admin.
 */
export const userStats = async (req: Request, res: Response) => {
  ensureAdmin(req);
  const [total, admins, users, last7d] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.user.count({ where: { role: "USER" } }),
    prisma.user.count({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) } },
    }),
  ]);

  res.json({
    total,
    byRole: { ADMIN: admins, USER: users },
    newLast7d: last7d,
  });
};
