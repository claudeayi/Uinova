// src/controllers/badgeController.ts
import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../utils/prisma";

/* ============================================================================
 *  CONFIG & SCHEMAS
 * ========================================================================== */
export const BADGE_TYPES = [
  "EARLY_ADOPTER",
  "PRO_USER",
  "COMMUNITY_HELPER",
  "TOP_CREATOR",
  "BETA_TESTER",
  "CONTRIBUTOR",
  "LEGENDARY_CREATOR",
] as const;

const GiveBadgeSchema = z.object({
  type: z.enum(BADGE_TYPES),
  userId: z.string().cuid().optional(),
  meta: z.record(z.any()).optional(),
});

const BulkGiveSchema = z.object({
  badges: z.array(GiveBadgeSchema).min(1),
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

const IdParam = z.object({ id: z.string().cuid() });
const BulkRevokeSchema = z.object({ ids: z.array(z.string().cuid()).min(1) });

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
  return { id: u.sub || u.id, role: u.role || "USER", email: u.email };
}
function ensureAdmin(role?: string) {
  if (role !== "ADMIN") {
    const err: any = new Error("Forbidden");
    err.status = 403;
    throw err;
  }
}

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
 *  CRUD & ACTIONS
 * ========================================================================== */

// ✅ Donner un badge
export const give = async (req: Request, res: Response) => {
  try {
    const caller = ensureAuth(req);
    const { type, userId: targetUserIdRaw, meta } = GiveBadgeSchema.parse(req.body);

    const targetUserId = targetUserIdRaw ?? caller.id;
    if (targetUserId !== caller.id) ensureAdmin(caller.role);

    const badge = await prisma.badge.upsert({
      where: { userId_type: { userId: targetUserId, type } },
      update: { meta: meta ?? undefined, updatedAt: new Date() },
      create: { userId: targetUserId, type, meta: meta ?? undefined, earnedAt: new Date() },
      select: selectBadge,
    });

    await prisma.auditLog.create({
      data: { userId: caller.id, action: "BADGE_GIVEN", metadata: { type, targetUserId, meta } },
    });

    return res.status(201).json({ success: true, data: badge });
  } catch (e: any) {
    console.error("❌ give badge error:", e);
    if (e?.code === "P2002") {
      return res.status(409).json({ success: false, message: "Badge déjà attribué." });
    }
    return res.status(500).json({ success: false, message: "Erreur assignation badge" });
  }
};

// ✅ Donner plusieurs badges
export const bulkGive = async (req: Request, res: Response) => {
  try {
    const caller = ensureAuth(req);
    ensureAdmin(caller.role);

    const { badges } = BulkGiveSchema.parse(req.body);

    const created = await Promise.all(
      badges.map((b) =>
        prisma.badge.upsert({
          where: { userId_type: { userId: b.userId!, type: b.type } },
          update: { meta: b.meta ?? undefined, updatedAt: new Date() },
          create: { userId: b.userId!, type: b.type, meta: b.meta ?? undefined, earnedAt: new Date() },
          select: selectBadge,
        })
      )
    );

    await prisma.auditLog.create({
      data: { userId: caller.id, action: "BADGE_BULK_GIVE", metadata: { count: created.length } },
    });

    return res.status(201).json({ success: true, count: created.length, data: created });
  } catch (err: any) {
    console.error("❌ bulkGive error:", err);
    return res.status(500).json({ success: false, message: "Erreur assignation multiple" });
  }
};

// ✅ Lister les badges
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

// ✅ Détail d’un badge
export const getOne = async (req: Request, res: Response) => {
  try {
    const caller = ensureAuth(req);
    const { id } = IdParam.parse(req.params);

    const badge = await prisma.badge.findUnique({ where: { id }, select: selectBadge });
    if (!badge) return res.status(404).json({ success: false, message: "Badge introuvable" });

    if (caller.role !== "ADMIN" && badge.userId !== caller.id) {
      return res.status(403).json({ success: false, message: "Accès interdit" });
    }

    return res.json({ success: true, data: badge });
  } catch (e: any) {
    console.error("❌ getOne badge error:", e);
    return res.status(500).json({ success: false, message: "Erreur récupération badge" });
  }
};

// ❌ Retirer un badge
export const revoke = async (req: Request, res: Response) => {
  try {
    const caller = ensureAuth(req);
    const { id } = IdParam.parse(req.params);

    const badge = await prisma.badge.findUnique({ where: { id } });
    if (!badge) return res.status(404).json({ success: false, message: "Badge introuvable" });

    if (caller.role !== "ADMIN" && badge.userId !== caller.id) {
      return res.status(403).json({ success: false, message: "Accès interdit" });
    }

    await prisma.badge.delete({ where: { id } });

    await prisma.auditLog.create({
      data: { userId: caller.id, action: "BADGE_REVOKED", metadata: { badgeId: id, type: badge.type } },
    });

    return res.json({ success: true, message: "Badge retiré" });
  } catch (e: any) {
    console.error("❌ revoke badge error:", e);
    return res.status(500).json({ success: false, message: "Erreur retrait badge" });
  }
};

// ❌ Retirer plusieurs badges
export const bulkRevoke = async (req: Request, res: Response) => {
  try {
    const caller = ensureAuth(req);
    ensureAdmin(caller.role);
    const { ids } = BulkRevokeSchema.parse(req.body);

    const result = await prisma.badge.deleteMany({ where: { id: { in: ids } } });

    await prisma.auditLog.create({
      data: { userId: caller.id, action: "BADGE_BULK_REVOKE", metadata: { count: result.count } },
    });

    return res.json({ success: true, count: result.count });
  } catch (err: any) {
    console.error("❌ bulkRevoke error:", err);
    return res.status(500).json({ success: false, message: "Erreur retrait multiple" });
  }
};

/* ============================================================================
 *  EXTRA FEATURES
 * ========================================================================== */

// 📊 Stats des badges
export const stats = async (_req: Request, res: Response) => {
  try {
    const [total, byType, topUsers] = await Promise.all([
      prisma.badge.count(),
      prisma.badge.groupBy({ by: ["type"], _count: { type: true } }),
      prisma.badge.groupBy({
        by: ["userId"],
        _count: { userId: true },
        orderBy: { _count: { userId: "desc" } },
        take: 5,
      }),
    ]);

    res.json({ success: true, data: { total, byType, topUsers } });
  } catch (err) {
    console.error("❌ stats badges error:", err);
    res.status(500).json({ success: false, message: "Erreur stats badges" });
  }
};

// 📤 Export badges
export const exportBadges = async (req: Request, res: Response) => {
  try {
    const format = (req.query.format as string) || "json";
    const badges = await prisma.badge.findMany({ select: selectBadge });

    if (format === "json") return res.json({ success: true, data: badges });
    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv");
      res.send(badges.map((b) => `${b.id},${b.userId},${b.type},${b.earnedAt}`).join("\n"));
      return;
    }
    if (format === "md") {
      res.type("markdown").send(
        badges.map((b) => `- **${b.type}** attribué à user ${b.userId} (${b.earnedAt})`).join("\n")
      );
      return;
    }
    res.status(400).json({ success: false, message: "Format non supporté" });
  } catch (err) {
    console.error("❌ exportBadges error:", err);
    res.status(500).json({ success: false, message: "Erreur export badges" });
  }
};
