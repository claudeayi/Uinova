// src/models/badgeModel.ts
import prisma from "../utils/prisma";

/** Types de badges supportés (adapte à ton produit) */
export const BADGE_TYPES = [
  "EARLY_ADOPTER",
  "PRO_USER",
  "COMMUNITY_HELPER",
  "TOP_CREATOR",
  "BETA_TESTER",
] as const;
export type BadgeType = typeof BADGE_TYPES[number];

type Id = string | number;

const selectBadge = {
  id: true,
  userId: true,
  type: true,
  earnedAt: true,
  meta: true as const,
  createdAt: true,
  updatedAt: true,
};

function toId(v: Id): any {
  const n = Number(v);
  return Number.isFinite(n) && String(n) === String(v) ? n : String(v);
}

export type BadgeDTO = {
  id: string | number;
  userId: string | number;
  type: BadgeType;
  earnedAt: Date;
  meta: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
};

function toBadgeDTO(b: any): BadgeDTO {
  return {
    id: b.id,
    userId: b.userId,
    type: b.type as BadgeType,
    earnedAt: b.earnedAt,
    meta: b.meta ?? null,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

/**
 * Attribue un badge à un utilisateur.
 * - Par défaut, évite les doublons (même type pour le même user) avec upsert.
 * - Mets `allowDuplicate=true` pour forcer un nouveau record (rarement utile).
 * ⚠️ Assure-toi d’avoir l’unique Prisma: @@unique([userId, type], name: "userId_type")
 */
export async function awardBadge(params: {
  userId: Id;
  type: BadgeType;
  meta?: Record<string, any>;
  allowDuplicate?: boolean;
}): Promise<BadgeDTO> {
  const { userId, type, meta, allowDuplicate } = params;

  if (allowDuplicate) {
    const rec = await prisma.badge.create({
      data: { userId: toId(userId), type, meta: meta ?? {}, earnedAt: new Date() },
      select: selectBadge,
    });
    return toBadgeDTO(rec);
  }

  const rec = await prisma.badge.upsert({
    where: { userId_type: { userId: toId(userId), type } as any },
    update: { meta: meta ?? undefined },
    create: { userId: toId(userId), type, meta: meta ?? {}, earnedAt: new Date() },
    select: selectBadge,
  });
  return toBadgeDTO(rec);
}

/** Récupère un badge par id */
export async function getBadgeById(id: Id): Promise<BadgeDTO | null> {
  const rec = await prisma.badge.findUnique({ where: { id: toId(id) } as any, select: selectBadge });
  return rec ? toBadgeDTO(rec) : null;
}

/** Liste paginée/filtrée des badges d’un utilisateur */
export async function getBadgesByUser(
  userId: Id,
  opts?: {
    type?: BadgeType;
    page?: number;
    pageSize?: number;
    sort?: "earnedAt:desc" | "earnedAt:asc" | "type:asc" | "type:desc";
  }
): Promise<{ items: BadgeDTO[]; page: number; pageSize: number; total: number; totalPages: number }> {
  const page = Math.max(1, opts?.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, opts?.pageSize ?? 50));
  const [field, dir] = (opts?.sort ?? "earnedAt:desc").split(":") as ["earnedAt" | "type", "asc" | "desc"];

  const where: any = { userId: toId(userId) };
  if (opts?.type) where.type = opts.type;

  const [total, rows] = await Promise.all([
    prisma.badge.count({ where }),
    prisma.badge.findMany({
      where,
      orderBy: { [field]: dir },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: selectBadge,
    }),
  ]);

  return {
    items: rows.map(toBadgeDTO),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Met à jour le meta d’un badge (merge simple côté appelant si besoin) */
export async function updateBadgeMeta(id: Id, meta: Record<string, any>): Promise<BadgeDTO> {
  const rec = await prisma.badge.update({
    where: { id: toId(id) } as any,
    data: { meta },
    select: selectBadge,
  });
  return toBadgeDTO(rec);
}

/** Supprime un badge par id */
export async function removeBadge(id: Id): Promise<BadgeDTO> {
  const rec = await prisma.badge.delete({ where: { id: toId(id) } as any, select: selectBadge });
  return toBadgeDTO(rec);
}

/** Liste les types de badges supportés */
export function listBadgeTypes(): BadgeType[] {
  return [...BADGE_TYPES];
}
