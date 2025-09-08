// src/controllers/marketplaceController.ts
import { Request, Response } from "express";
import { prisma } from "../utils/prisma";

/* ============================================================================
 *  MARKETPLACE CONTROLLER – CRUD + PURCHASES
 * ========================================================================== */

// ✅ GET /marketplace/items → liste publique
export async function listItems(req: Request, res: Response) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const search = req.query.search ? String(req.query.search) : undefined;

    const where: any = { published: true };
    if (search) where.title = { contains: search, mode: "insensitive" };

    const [items, total] = await Promise.all([
      prisma.marketplaceItem.findMany({
        where,
        include: {
          owner: { select: { id: true, email: true, name: true } },
          _count: { select: { purchases: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.marketplaceItem.count({ where }),
    ]);

    res.json({
      success: true,
      data: items,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("❌ listItems error:", err);
    res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
}

// ✅ GET /marketplace/admin/items → liste complète
export async function listAllItems(req: Request, res: Response) {
  try {
    const role = (req as any).user?.role;
    if (role !== "ADMIN") {
      return res.status(403).json({ success: false, error: "FORBIDDEN" });
    }

    const items = await prisma.marketplaceItem.findMany({
      include: {
        owner: { select: { id: true, email: true, name: true } },
        _count: { select: { purchases: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: items });
  } catch (err) {
    console.error("❌ listAllItems error:", err);
    res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
}

// ✅ GET /marketplace/items/:id → détail
export async function getItem(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const item = await prisma.marketplaceItem.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, email: true, name: true } },
        _count: { select: { purchases: true } },
      },
    });
    if (!item) return res.status(404).json({ success: false, error: "NOT_FOUND" });
    res.json({ success: true, data: item });
  } catch (err) {
    console.error("❌ getItem error:", err);
    res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
}

// ✅ POST /marketplace/items → publier
export async function publishItem(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    const role = (req as any).user?.role;
    if (!userId) return res.status(401).json({ success: false, error: "UNAUTHORIZED" });

    if (!["PREMIUM", "ADMIN"].includes(role)) {
      return res.status(403).json({ success: false, error: "FORBIDDEN" });
    }

    const { title, description, priceCents, currency, contentUrl } = req.body;
    if (!title || !contentUrl) {
      return res.status(400).json({ success: false, error: "BAD_REQUEST", message: "Titre et contenu requis" });
    }

    const item = await prisma.marketplaceItem.create({
      data: {
        title,
        description,
        priceCents: priceCents || 0,
        currency: currency || "EUR",
        ownerId: userId,
        published: true,
        contentUrl,
      },
    });

    await prisma.auditLog.create({
      data: { userId, action: "MARKETPLACE_PUBLISH", details: `Item ${item.id} publié` },
    });

    res.status(201).json({ success: true, data: item });
  } catch (err) {
    console.error("❌ publishItem error:", err);
    res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
}

// ✅ PUT /marketplace/items/:id → mise à jour
export async function updateItem(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    const role = (req as any).user?.role;
    const { id } = req.params;

    const item = await prisma.marketplaceItem.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ success: false, error: "NOT_FOUND" });

    if (item.ownerId !== userId && role !== "ADMIN") {
      return res.status(403).json({ success: false, error: "FORBIDDEN" });
    }

    const { title, description, priceCents, currency, published } = req.body;
    const updated = await prisma.marketplaceItem.update({
      where: { id },
      data: { title, description, priceCents, currency, published },
    });

    await prisma.auditLog.create({
      data: { userId, action: "MARKETPLACE_UPDATE", details: `Item ${id} mis à jour` },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("❌ updateItem error:", err);
    res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
}

// ✅ DELETE /marketplace/items/:id
export async function deleteItem(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    const role = (req as any).user?.role;
    const { id } = req.params;

    const item = await prisma.marketplaceItem.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ success: false, error: "NOT_FOUND" });

    if (item.ownerId !== userId && role !== "ADMIN") {
      return res.status(403).json({ success: false, error: "FORBIDDEN" });
    }

    await prisma.marketplaceItem.delete({ where: { id } });

    await prisma.auditLog.create({
      data: { userId, action: "MARKETPLACE_DELETE", details: `Item ${id} supprimé` },
    });

    res.json({ success: true, message: "Item supprimé" });
  } catch (err) {
    console.error("❌ deleteItem error:", err);
    res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
}

// ✅ POST /marketplace/purchase → achat
export async function purchaseItem(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ success: false, error: "UNAUTHORIZED" });

    const { itemId } = req.body;
    if (!itemId) return res.status(400).json({ success: false, error: "MISSING_ITEM" });

    const item = await prisma.marketplaceItem.findUnique({ where: { id: itemId } });
    if (!item) return res.status(404).json({ success: false, error: "NOT_FOUND" });

    const existing = await prisma.purchase.findFirst({ where: { itemId, buyerId: userId } });
    if (existing) {
      return res.json({ success: true, message: "Déjà acheté", downloadUrl: item.contentUrl });
    }

    const purchase = await prisma.purchase.create({ data: { itemId, buyerId: userId, status: "paid" } });

    await prisma.auditLog.create({
      data: { userId, action: "MARKETPLACE_PURCHASE", details: `Item ${itemId} acheté` },
    });

    res.json({
      success: true,
      message: "Achat réussi",
      item,
      downloadUrl: item.contentUrl,
      purchase,
    });
  } catch (err) {
    console.error("❌ purchaseItem error:", err);
    res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
}

// ✅ GET /marketplace/purchases → mes achats
export async function listPurchases(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ success: false, error: "UNAUTHORIZED" });

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [purchases, total] = await Promise.all([
      prisma.purchase.findMany({
        where: { buyerId: userId },
        include: { item: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.purchase.count({ where: { buyerId: userId } }),
    ]);

    res.json({
      success: true,
      data: purchases,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("❌ listPurchases error:", err);
    res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
}
