// src/controllers/badgeController.ts
import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../utils/prisma";

// --- Config / Types autorisés
export const BADGE_TYPES = [
  "EARLY_ADOPTER",
  "PRO_USER",
  "COMMUNITY_HELPER",
  "TOP_CREATOR",
  "BETA_TESTER",
] as const;

const GiveBadgeSchema = z.object({
  type: z.enum(BADGE_TYPES),
  userId: z.string().cuid().optional(), // si omis -> badge à soi-même
  meta: z.record(z.any()).optional(),
});

const ListQuerySchema = z.object({
  userId: z.string().cuid().optional(),
  type: z.enum(BADGE_TYPES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  sort: z
    .enum(["earnedAt:desc", "earnedAt:asc", "type:asc", "type:desc"])
    .default("earnedAt:desc"),
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

// Sélection uniforme
const selectBadge = {
  id: true,
  type: true,
  userId: true,
  earnedAt: true,
  meta: true as const,
  createdAt: true,
  updatedAt: true,
};

/* ============================================================================
 *  POST /api/badges/give
 * ========================================================================== */
export const give = async (req: Request, res: Response) => {
  try {
    const caller = ensureAuth(req);
    const { type, userId: targetUserIdRaw, meta } = GiveBadgeSchema.parse(req.body);

    const targetUserId = targetUserIdRaw ?? caller.id;
    if (targetUserId !== caller.id) ensureAdmin(caller.role);

    const badge = await prisma.badge.upsert({
      where: { userId_type: { userId: targetUserId, type } },
      update: { meta: meta ?? undefined },
      create: { userId: targetUserId, type, meta: meta ?? undefined, earnedAt: new Date() },
      select: selectBadge,
    });

    await prisma.auditLog.create({
      data: {
        action: "BADGE_GIVEN",
        userId: caller.id,
        details: `Badge ${type} donné à ${targetUserId}`,
      },
    });

    return res.status(201).json({ success: true, data: badge });
  } catch (e: any) {
    console.error("❌ give badge error:", e);
    if (e?.code === "P2002") {
      return res
        .status(409)
        .json({ success: false, message: "Badge déjà attribué à cet utilisateur." });
    }
    return res.status(500).json({ success: false, message: "Erreur assignation badge" });
  }
};

/* ============================================================================
 *  GET /api/badges
 * ========================================================================== */
export const list = async (req: Request, res: Response) => {
  try {
    const caller = ensureAuth(req);
    const { userId: qUserId, type, page, pageSize, sort } = ListQuerySchema.parse(req.query);

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

    return res.json({
      success: true,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      data: items,
    });
  } catch (e: any) {
    console.error("❌ list badges error:", e);
    return res.status(500).json({ success: false, message: "Erreur récupération badges" });
  }
};

/* ============================================================================
 *  DELETE /api/badges/:id
 * ========================================================================== */
export const revoke = async (req: Request, res: Response) => {
  try {
    const caller = ensureAuth(req);
    const { id } = req.params;

    const badge = await prisma.badge.findUnique({
      where: { id },
      select: { id: true, userId: true, type: true },
    });
    if (!badge) return res.status(404).json({ success: false, message: "Badge introuvable" });

    if (caller.role !== "ADMIN" && badge.userId !== caller.id) {
      return res.status(403).json({ success: false, message: "Accès interdit" });
    }

    await prisma.badge.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        action: "BADGE_REVOKED",
        userId: caller.id,
        details: `Badge ${badge.type} retiré de ${badge.userId}`,
      },
    });

    return res.json({ success: true, message: "Badge retiré avec succès" });
  } catch (e: any) {
    console.error("❌ revoke badge error:", e);
    return res.status(500).json({ success: false, message: "Erreur retrait badge" });
  }
};
