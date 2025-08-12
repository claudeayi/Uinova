// src/controllers/badgeController.ts
import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../utils/prisma";

// --- Config / Types autorisés (adapte selon ton produit)
export const BADGE_TYPES = [
  "EARLY_ADOPTER",
  "PRO_USER",
  "COMMUNITY_HELPER",
  "TOP_CREATOR",
  "BETA_TESTER",
] as const;

const GiveBadgeSchema = z.object({
  type: z.enum(BADGE_TYPES),
  userId: z.string().cuid().optional(),   // si omis -> badge à soi-même
  meta: z.record(z.any()).optional(),     // infos additionnelles optionnelles
});

const ListQuerySchema = z.object({
  userId: z.string().cuid().optional(),   // ADMIN peut lister pour un autre user
  type: z.enum(BADGE_TYPES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  sort: z.enum(["earnedAt:desc","earnedAt:asc","type:asc","type:desc"]).default("earnedAt:desc"),
});

// Petits helpers
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

// DTO de réponse
const selectBadge = {
  id: true,
  type: true,
  userId: true,
  earnedAt: true,
  meta: true as const,
  createdAt: true,
  updatedAt: true,
};

// =======================
// POST /api/badges/give
// Body: { type, userId?, meta? }
// - USER : peut se donner un badge si logique prévue (ex: badge “BETA_TESTER” via action).
// - ADMIN : peut donner un badge à n’importe quel user (userId obligatoire dans ce cas).
// Anti-doublon: unique (userId, type) via upsert.
// =======================
export const give = async (req: Request, res: Response) => {
  const caller = ensureAuth(req);
  const { type, userId: targetUserIdRaw, meta } = GiveBadgeSchema.parse(req.body);

  // Cible
  const targetUserId = targetUserIdRaw ?? caller.id;

  // Si on cible un autre user, il faut être ADMIN
  if (targetUserId !== caller.id) ensureAdmin(caller.role);

  // Anti-doublon: nécessite un index unique Prisma (userId, type).
  // Schéma conseillé:
  // model Badge {
  //   id       String   @id @default(cuid())
  //   userId   String
  //   type     String
  //   meta     Json?
  //   earnedAt DateTime @default(now())
  //   createdAt DateTime @default(now())
  //   updatedAt DateTime @updatedAt
  //   @@unique([userId, type])
  // }
  try {
    const b = await prisma.badge.upsert({
      where: { userId_type: { userId: targetUserId, type } },
      update: { meta: meta ?? undefined }, // si le badge existe, on peut mettre à jour meta
      create: { userId: targetUserId, type, meta: meta ?? undefined, earnedAt: new Date() },
      select: selectBadge,
    });
    return res.status(201).json({ ok: true, badge: b });
  } catch (e: any) {
    // Si l’index unique n’est pas en place et qu’un conflit survient, Prisma lèvera P2002
    if (e?.code === "P2002") {
      return res.status(409).json({ ok: false, error: "Badge déjà attribué à cet utilisateur." });
    }
    throw e;
  }
};

// =======================
// GET /api/badges
// Query: ?userId=&type=&page=&pageSize=&sort=earnedAt:desc|earnedAt:asc|type:asc|type:desc
// - USER : liste ses propres badges
// - ADMIN : peut lister pour un autre user via ?userId=
// =======================
export const list = async (req: Request, res: Response) => {
  const caller = ensureAuth(req);
  const { userId: qUserId, type, page, pageSize, sort } = ListQuerySchema.parse(req.query);

  // Cible de la liste
  const targetUserId = qUserId ?? caller.id;
  if (targetUserId !== caller.id) ensureAdmin(caller.role);

  const where: any = { userId: targetUserId };
  if (type) where.type = type;

  const [sortField, sortDir] = sort.split(":") as ["earnedAt" | "type", "asc" | "desc"];
  const orderBy: any = { [sortField]: sortDir };

  const [total, items] = await Promise.all([
    prisma.badge.count({ where }),
    prisma.badge.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: selectBadge,
    }),
  ]);

  res.json({
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
};

// =======================
// (optionnel) DELETE /api/badges/:id
// - ADMIN : peut révoquer un badge
// - USER : peut supprimer ses propres badges si tu le souhaites (sinon restreindre à ADMIN)
// =======================
export const revoke = async (req: Request, res: Response) => {
  const caller = ensureAuth(req);
  const { id } = req.params;

  // Autorisation: ADMIN ou propriétaire du badge (si tu veux autoriser l’auto-retrait)
  const badge = await prisma.badge.findUnique({ where: { id }, select: { id: true, userId: true } });
  if (!badge) return res.status(404).json({ error: "Badge not found" });

  if (caller.role !== "ADMIN" && badge.userId !== caller.id) {
    const err: any = new Error("Forbidden");
    err.status = 403;
    throw err;
  }

  await prisma.badge.delete({ where: { id } });
  res.json({ ok: true });
};
