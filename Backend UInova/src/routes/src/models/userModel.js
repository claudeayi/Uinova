// src/models/userModel.ts
import { prisma } from "../utils/prisma";
import { hashPassword } from "../utils/hash";

export type UserRole = "USER" | "PREMIUM" | "ADMIN";
type Id = string | number;

const selectUserSafe = {
  id: true,
  email: true,
  role: true,
  displayName: true,
  createdAt: true,
  updatedAt: true,
} as const;

function toId(v: Id): any {
  const n = Number(v);
  return Number.isFinite(n) && String(n) === String(v) ? n : String(v);
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export type UserDTO = {
  id: Id;
  email: string;
  role: UserRole;
  displayName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function toUserDTO(u: any): UserDTO {
  return {
    id: u.id,
    email: u.email,
    role: (u.role || "USER") as UserRole,
    displayName: u.displayName ?? null,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

/* =========================
 * LIST (pagination / recherche / filtre rôle)
 * ========================= */
export async function listUsers(opts?: {
  q?: string;                        // recherche par email/displayName
  role?: UserRole;
  page?: number;
  pageSize?: number;
  sort?: "createdAt:desc" | "createdAt:asc" | "email:asc" | "email:desc";
}): Promise<{ items: UserDTO[]; page: number; pageSize: number; total: number; totalPages: number }> {
  const page = Math.max(1, opts?.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, opts?.pageSize ?? 50));
  const [field, dir] = (opts?.sort ?? "createdAt:desc").split(":") as ["createdAt" | "email", "asc" | "desc"];

  const where: any = {};
  if (opts?.role) where.role = opts.role;
  if (opts?.q) {
    const q = opts.q.trim();
    where.OR = [
      { email: { contains: q, mode: "insensitive" } },
      { displayName: { contains: q, mode: "insensitive" } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { [field]: dir },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: selectUserSafe,
    }),
  ]);

  return {
    items: rows.map(toUserDTO),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/* =========================
 * GETTERS
 * ========================= */
export async function getAllUsers(): Promise<UserDTO[]> {
  const rows = await prisma.user.findMany({ select: selectUserSafe, orderBy: { createdAt: "desc" } });
  return rows.map(toUserDTO);
}

export async function getUserById(id: Id): Promise<UserDTO | null> {
  const u = await prisma.user.findUnique({ where: { id: toId(id) } as any, select: selectUserSafe });
  return u ? toUserDTO(u) : null;
}

export async function getUserByEmail(email: string): Promise<UserDTO | null> {
  // ⚠️ Assure-toi de stocker les emails en minuscule (unique index sur email en DB)
  const u = await prisma.user.findUnique({ where: { email: normalizeEmail(email) }, select: selectUserSafe });
  return u ? toUserDTO(u) : null;
}

/* =========================
 * CREATE
 * ========================= */
export async function createUser(data: {
  email: string;
  password: string;            // plain text (sera hashé)
  role?: UserRole;
  displayName?: string | null;
}): Promise<UserDTO> {
  const email = normalizeEmail(data.email);
  const passwordHash = await hashPassword(data.password);

  const rec = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: data.role ?? "USER",
      displayName: data.displayName ?? null,
    },
    select: selectUserSafe,
  });

  return toUserDTO(rec);
}

/* =========================
 * UPDATE (patch)
 * ========================= */
export async function updateUser(
  id: Id,
  data: Partial<{
    email: string;
    password: string;          // plain (hash auto)
    role: UserRole;
    displayName: string | null;
  }>
): Promise<UserDTO> {
  const patch: any = {};
  if (data.email !== undefined) patch.email = normalizeEmail(data.email);
  if (data.password !== undefined) patch.passwordHash = await hashPassword(data.password);
  if (data.role !== undefined) patch.role = data.role;
  if (data.displayName !== undefined) patch.displayName = data.displayName;

  const rec = await prisma.user.update({
    where: { id: toId(id) } as any,
    data: patch,
    select: selectUserSafe,
  });

  return toUserDTO(rec);
}

/* =========================
 * DELETE
 * ========================= */
export async function deleteUser(id: Id): Promise<{ ok: true }> {
  await prisma.user.delete({ where: { id: toId(id) } as any });
  return { ok: true };
}

/* =========================
 * HELPERS SUPPLÉMENTAIRES
 * ========================= */
export async function setUserRole(id: Id, role: UserRole): Promise<UserDTO> {
  const rec = await prisma.user.update({
    where: { id: toId(id) } as any,
    data: { role },
    select: selectUserSafe,
  });
  return toUserDTO(rec);
}

export async function existsByEmail(email: string): Promise<boolean> {
  const u = await prisma.user.findUnique({ where: { email: normalizeEmail(email) }, select: { id: true } });
  return !!u;
}
