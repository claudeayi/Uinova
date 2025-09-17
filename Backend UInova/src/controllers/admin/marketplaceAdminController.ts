// src/controllers/admin/marketplaceAdminController.ts
import { Request, Response } from "express";
import { prisma } from "../../utils/prisma";
import { z } from "zod";

/* ============================================================================
 * VALIDATION
 * ========================================================================== */
const IdSchema = z.string().min(1, "id requis");
const ValidateSchema = z.object({ validated: z.boolean() });
const BulkSchema = z.object({ ids: z.array(z.string().min(1)).min(1) });

const ListQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  authorId: z.string().optional(),
  validated: z.coerce.boolean().optional(),
  published: z.coerce.boolean().optional(),
  search: z.string().optional(),
  since: z.coerce.date().optional(),
  until: z.coerce.date().optional(),
  sort: z.enum(["createdAt:desc", "createdAt:asc"]).default("createdAt:desc"),
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
  } catch {
    /* ignore */
  }
}

/* ============================================================================
 * CONTROLLERS
 * ========================================================================== */

// 📋 Liste des items du marketplace (avec filtres/pagination)
export async function listMarketplaceItems(req: Request, res: Response) {
  try {
    ensureAdmin(req);
    const q = ListQuerySchema.parse(req.query);

    const { page, pageSize, authorId, validated, published, search, since, until, sort } = q;

    const where: any = {};
    if (authorId) where.authorId = authorId;
    if (validated !== undefined) where.validated = validated;
    if (published !== undefined) where.published = published;
    if (search) where.name = { contains: search, mode: "insensitive" };
    if (since || until) {
      where.createdAt = {};
      if (since) where.createdAt.gte = since;
      if (until) where.createdAt.lte = until;
    }

    const [field, dir] = sort.split(":") as ["createdAt", "asc" | "desc"];
    const orderBy: any = { [field]: dir };

    const [total, items] = await Promise.all([
      prisma.marketplaceItem.count({ where }),
      prisma.marketplaceItem.findMany({
        where,
        include: {
          author: { select: { id: true, email: true } },
          _count: { select: { purchases: true } },
        },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    res.json({ success: true, data: items, pagination: { total, page, pageSize } });
  } catch (err) {
    console.error("❌ listMarketplaceItems error:", err);
    res.status(500).json({ success: false, message: "Erreur récupération items marketplace" });
  }
}

// 🔎 Détail d’un item
export async function getMarketplaceItemById(req: Request, res: Response) {
  try {
    ensureAdmin(req);
    const { id } = IdSchema.parse(req.params.id);

    const item = await prisma.marketplaceItem.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, email: true } },
        purchases: { select: { id: true, userId: true, createdAt: true } },
      },
    });

    if (!item) return res.status(404).json({ success: false, message: "Item introuvable" });

    await auditLog((req as any).user?.id, "ADMIN_MARKETPLACE_VIEW", { itemId: id });

    res.json({ success: true, data: item });
  } catch (err: any) {
    console.error("❌ getMarketplaceItemById error:", err);
    res.status(500).json({ success: false, message: "Erreur récupération item marketplace" });
  }
}

// ✅ Validation d’un item
export async function validateMarketplaceItem(req: Request, res: Response) {
  try {
    ensureAdmin(req);
    const { id } = IdSchema.parse(req.params.id);
    const { validated } = ValidateSchema.parse(req.body);

    const item = await prisma.marketplaceItem.update({
      where: { id },
      data: { validated },
    });

    await auditLog((req as any).user?.id, "ADMIN_MARKETPLACE_VALIDATE", { itemId: id, validated });

    res.json({ success: true, data: item });
  } catch (err: any) {
    console.error("❌ validateMarketplaceItem error:", err);
    res.status(500).json({ success: false, message: "Erreur validation item" });
  }
}

// 🗑️ Suppression (soft delete)
export async function deleteMarketplaceItem(req: Request, res: Response) {
  try {
    ensureAdmin(req);
    const { id } = IdSchema.parse(req.params.id);

    const deleted = await prisma.marketplaceItem.update({
      where: { id },
      data: { deletedAt: new Date(), published: false },
    });

    await auditLog((req as any).user?.id, "ADMIN_MARKETPLACE_DELETE", { itemId: id });

    res.json({ success: true, message: `Item ${id} archivé`, data: deleted });
  } catch (err: any) {
    console.error("❌ deleteMarketplaceItem error:", err);
    res.status(500).json({ success: false, message: "Erreur suppression item marketplace" });
  }
}

// 🔙 Restaurer un item
export async function restoreMarketplaceItem(req: Request, res: Response) {
  try {
    ensureAdmin(req);
    const { id } = IdSchema.parse(req.params.id);

    const restored = await prisma.marketplaceItem.update({
      where: { id },
      data: { deletedAt: null },
    });

    await auditLog((req as any).user?.id, "ADMIN_MARKETPLACE_RESTORE", { itemId: id });

    res.json({ success: true, data: restored });
  } catch (err) {
    console.error("❌ restoreMarketplaceItem error:", err);
    res.status(500).json({ success: false, message: "Erreur restauration item" });
  }
}

// 📊 Stats enrichies
export async function marketplaceStats(req: Request, res: Response) {
  try {
    ensureAdmin(req);

    const [total, validated, published, purchases, byAuthor, last7d] = await Promise.all([
      prisma.marketplaceItem.count(),
      prisma.marketplaceItem.count({ where: { validated: true } }),
      prisma.marketplaceItem.count({ where: { published: true } }),
      prisma.purchase.count(),
      prisma.marketplaceItem.groupBy({ by: ["authorId"], _count: { authorId: true } }),
      prisma.marketplaceItem.count({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) } },
      }),
    ]);

    const revenue = await prisma.purchase.aggregate({ _sum: { amount: true } });

    res.json({
      success: true,
      data: {
        totalItems: total,
        validatedItems: validated,
        publishedItems: published,
        totalPurchases: purchases,
        revenue: revenue._sum.amount || 0,
        byAuthor,
        newLast7d: last7d,
      },
    });
  } catch (err) {
    console.error("❌ marketplaceStats error:", err);
    res.status(500).json({ success: false, message: "Erreur récupération stats marketplace" });
  }
}

// 📤 Export (json / csv / md)
export async function exportMarketplaceItems(req: Request, res: Response) {
  try {
    ensureAdmin(req);
    const format = (req.query.format as string) || "json";
    const items = await prisma.marketplaceItem.findMany({ include: { author: true } });

    if (format === "json") return res.json({ success: true, data: items });
    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv");
      res.send(items.map(i => `${i.id},${i.name},${i.authorId},${i.price},${i.published}`).join("\n"));
      return;
    }
    if (format === "md") {
      res.type("markdown").send(
        items.map(i => `- **${i.name}** (id: ${i.id}, price: ${i.price}, published: ${i.published})`).join("\n")
      );
      return;
    }
    res.status(400).json({ success: false, message: "Format non supporté" });
  } catch (err) {
    console.error("❌ exportMarketplaceItems error:", err);
    res.status(500).json({ success: false, message: "Erreur export items marketplace" });
  }
}

// 🛠️ Bulk delete / restore
export async function bulkDeleteMarketplaceItems(req: Request, res: Response) {
  try {
    ensureAdmin(req);
    const { ids } = BulkSchema.parse(req.body);

    const result = await prisma.marketplaceItem.updateMany({
      where: { id: { in: ids } },
      data: { deletedAt: new Date(), published: false },
    });

    await auditLog((req as any).user?.id, "ADMIN_MARKETPLACE_BULK_DELETE", { ids });

    res.json({ success: true, count: result.count });
  } catch (err) {
    console.error("❌ bulkDeleteMarketplaceItems error:", err);
    res.status(500).json({ success: false, message: "Erreur bulk delete" });
  }
}

export async function bulkRestoreMarketplaceItems(req: Request, res: Response) {
  try {
    ensureAdmin(req);
    const { ids } = BulkSchema.parse(req.body);

    const result = await prisma.marketplaceItem.updateMany({
      where: { id: { in: ids } },
      data: { deletedAt: null },
    });

    await auditLog((req as any).user?.id, "ADMIN_MARKETPLACE_BULK_RESTORE", { ids });

    res.json({ success: true, count: result.count });
  } catch (err) {
    console.error("❌ bulkRestoreMarketplaceItems error:", err);
    res.status(500).json({ success: false, message: "Erreur bulk restore" });
  }
}
