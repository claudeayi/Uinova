// src/controllers/admin/marketplaceAdminController.ts
import { Request, Response } from "express";
import { prisma } from "../../utils/prisma";
import { z } from "zod";

/* ============================================================================
 * VALIDATION
 * ========================================================================== */
const IdSchema = z.string().min(1, "id requis");
const ValidateSchema = z.object({ validated: z.boolean() });

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

/* ============================================================================
 * CONTROLLERS
 * ========================================================================== */

// 📋 Liste des items du marketplace
export async function listMarketplaceItems(req: Request, res: Response) {
  try {
    ensureAdmin(req);

    const items = await prisma.marketplaceItem.findMany({
      include: {
        author: { select: { id: true, email: true } },
        _count: { select: { purchases: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    res.json({ success: true, total: items.length, data: items });
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
    if (err?.code === "P2025") return res.status(404).json({ success: false, message: "Item introuvable" });
    res.status(500).json({ success: false, message: "Erreur récupération item marketplace" });
  }
}

// ✅ Validation d’un item (admin approuve ou rejette)
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
    if (err?.code === "P2025") return res.status(404).json({ success: false, message: "Item introuvable" });
    res.status(500).json({ success: false, message: "Erreur validation item" });
  }
}

// 🗑️ Suppression d’un item du marketplace
export async function deleteMarketplaceItem(req: Request, res: Response) {
  try {
    ensureAdmin(req);
    const { id } = IdSchema.parse(req.params.id);

    await prisma.purchase.deleteMany({ where: { itemId: id } });
    await prisma.marketplaceItem.delete({ where: { id } });

    await auditLog((req as any).user?.id, "ADMIN_MARKETPLACE_DELETE", { itemId: id });

    res.json({ success: true, message: `Item ${id} supprimé` });
  } catch (err: any) {
    console.error("❌ deleteMarketplaceItem error:", err);
    if (err?.code === "P2025") return res.status(404).json({ success: false, message: "Item introuvable" });
    res.status(500).json({ success: false, message: "Erreur suppression item marketplace" });
  }
}

// 📊 Stats du marketplace
export async function marketplaceStats(req: Request, res: Response) {
  try {
    ensureAdmin(req);

    const [total, validated, published, purchases] = await Promise.all([
      prisma.marketplaceItem.count(),
      prisma.marketplaceItem.count({ where: { validated: true } }),
      prisma.marketplaceItem.count({ where: { published: true } }),
      prisma.purchase.count(),
    ]);

    res.json({
      success: true,
      data: {
        totalItems: total,
        validatedItems: validated,
        publishedItems: published,
        totalPurchases: purchases,
      },
    });
  } catch (err) {
    console.error("❌ marketplaceStats error:", err);
    res.status(500).json({ success: false, message: "Erreur récupération stats marketplace" });
  }
}
