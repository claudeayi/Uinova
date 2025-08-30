import { Request, Response } from "express";
import { prisma } from "../utils/prisma";

/* ============================================================================
 *  MARKETPLACE CONTROLLER – CRUD + PURCHASES
 * ========================================================================== */

// ✅ GET /marketplace/items → liste publique
export async function listItems(req: Request, res: Response) {
  try {
    const items = await prisma.marketplaceItem.findMany({
      where: { published: true },
      include: {
        owner: { select: { id: true, email: true, name: true } },
        _count: { select: { purchases: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(items);
  } catch (err) {
    console.error("❌ listItems error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "Erreur serveur" });
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
    if (!item) return res.status(404).json({ error: "NOT_FOUND", message: "Item introuvable" });
    res.json(item);
  } catch (err) {
    console.error("❌ getItem error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "Erreur serveur" });
  }
}

// ✅ POST /marketplace/items → publier (admin ou premium)
export async function publishItem(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    const role = (req as any).user?.role;
    if (!userId) return res.status(401).json({ error: "UNAUTHORIZED", message: "Non autorisé" });

    // ⚡ Autorisé si premium ou admin
    if (!["PREMIUM", "ADMIN"].includes(role)) {
      return res.status(403).json({ error: "FORBIDDEN", message: "Accès refusé" });
    }

    const { title, description, priceCents, currency, contentUrl } = req.body;
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
    res.status(201).json(item);
  } catch (err) {
    console.error("❌ publishItem error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "Erreur serveur" });
  }
}

// ✅ PUT /marketplace/items/:id → mise à jour (owner/admin)
export async function updateItem(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    const role = (req as any).user?.role;
    const { id } = req.params;

    const item = await prisma.marketplaceItem.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ error: "NOT_FOUND", message: "Item introuvable" });

    if (item.ownerId !== userId && role !== "ADMIN") {
      return res.status(403).json({ error: "FORBIDDEN", message: "Pas autorisé" });
    }

    const { title, description, priceCents, currency, published } = req.body;
    const updated = await prisma.marketplaceItem.update({
      where: { id },
      data: { title, description, priceCents, currency, published },
    });
    res.json(updated);
  } catch (err) {
    console.error("❌ updateItem error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "Erreur serveur" });
  }
}

// ✅ DELETE /marketplace/items/:id → suppression (owner/admin)
export async function deleteItem(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    const role = (req as any).user?.role;
    const { id } = req.params;

    const item = await prisma.marketplaceItem.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ error: "NOT_FOUND", message: "Item introuvable" });

    if (item.ownerId !== userId && role !== "ADMIN") {
      return res.status(403).json({ error: "FORBIDDEN", message: "Pas autorisé" });
    }

    await prisma.marketplaceItem.delete({ where: { id } });
    res.json({ success: true, message: "Item supprimé" });
  } catch (err) {
    console.error("❌ deleteItem error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "Erreur serveur" });
  }
}

// ✅ POST /marketplace/purchase → achat d’un item
export async function purchaseItem(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: "UNAUTHORIZED", message: "Non autorisé" });

    const { itemId } = req.body;
    const item = await prisma.marketplaceItem.findUnique({ where: { id: itemId } });
    if (!item) return res.status(404).json({ error: "NOT_FOUND", message: "Item introuvable" });

    // Vérifie si déjà acheté
    const existing = await prisma.purchase.findFirst({
      where: { itemId, buyerId: userId },
    });
    if (existing) {
      return res.json({
        success: true,
        message: "Déjà acheté",
        downloadUrl: item.contentUrl || `/downloads/${itemId}.zip`,
      });
    }

    const purchase = await prisma.purchase.create({
      data: { itemId, buyerId: userId },
    });

    res.json({
      success: true,
      message: "Achat réussi",
      downloadUrl: item.contentUrl || `/downloads/${itemId}.zip`,
      purchase,
    });
  } catch (err) {
    console.error("❌ purchaseItem error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "Erreur serveur" });
  }
}

// ✅ GET /marketplace/purchases → mes achats
export async function listPurchases(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: "UNAUTHORIZED" });

    const purchases = await prisma.purchase.findMany({
      where: { buyerId: userId },
      include: { item: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(purchases);
  } catch (err) {
    console.error("❌ listPurchases error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "Erreur serveur" });
  }
}
