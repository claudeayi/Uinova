import { Request, Response } from "express";
import { prisma } from "../utils/prisma";

// ✅ GET /marketplace/items → liste publique
export async function listItems(req: Request, res: Response) {
  try {
    const items = await prisma.marketplaceItem.findMany({
      include: { owner: { select: { id: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(items);
  } catch (err) {
    console.error("❌ listItems error:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
}

// ✅ GET /marketplace/items/:id → détail
export async function getItem(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const item = await prisma.marketplaceItem.findUnique({
      where: { id },
      include: { owner: { select: { id: true, email: true } } },
    });
    if (!item) return res.status(404).json({ message: "Item introuvable" });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
}

// ✅ POST /marketplace/items → publier (admin ou premium)
export async function publishItem(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id; // injecté par middleware auth
    if (!userId) return res.status(401).json({ message: "Non autorisé" });

    const { title, description, priceCents, currency } = req.body;
    const item = await prisma.marketplaceItem.create({
      data: {
        title,
        description,
        priceCents: priceCents || 0,
        currency: currency || "EUR",
        ownerId: userId,
      },
    });
    res.status(201).json(item);
  } catch (err) {
    console.error("❌ publishItem error:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
}

// ✅ POST /marketplace/purchase → achat d’un item
export async function purchaseItem(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: "Non autorisé" });

    const { itemId } = req.body;
    const item = await prisma.marketplaceItem.findUnique({ where: { id: itemId } });
    if (!item) return res.status(404).json({ message: "Item introuvable" });

    // Vérifie si déjà acheté
    const existing = await prisma.purchase.findFirst({
      where: { itemId, buyerId: userId },
    });
    if (existing) return res.status(400).json({ message: "Déjà acheté" });

    const purchase = await prisma.purchase.create({
      data: { itemId, buyerId: userId },
    });

    res.json({
      success: true,
      message: "Achat réussi",
      downloadUrl: `/downloads/${itemId}.zip`, // ⚡ provisoire
      purchase,
    });
  } catch (err) {
    console.error("❌ purchaseItem error:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
}
