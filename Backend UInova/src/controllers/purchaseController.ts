import { Request, Response } from "express";
import { prisma } from "../utils/prisma";

/* ============================================================================
 *  PURCHASE CONTROLLER
 * ========================================================================== */

// 📂 Liste des achats de l’utilisateur connecté
export async function listPurchases(req: Request, res: Response) {
  try {
    if (!req.user?.id) return res.status(401).json({ error: "UNAUTHORIZED" });

    const purchases = await prisma.purchase.findMany({
      where: { buyerId: req.user.id },
      include: { item: true },
      orderBy: { createdAt: "desc" },
    });

    res.json(
      purchases.map((p) => ({
        id: p.id,
        itemId: p.itemId,
        type: p.item ? "template" : "component", // simplifié
        name: p.item?.title || "Item inconnu",
        status: "paid", // futur champ `status` si on enrichit
        createdAt: p.createdAt,
      }))
    );
  } catch (e) {
    console.error("❌ listPurchases error:", e);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
}

// ➕ Créer un achat (après paiement validé)
export async function createPurchase(req: Request, res: Response) {
  try {
    if (!req.user?.id) return res.status(401).json({ error: "UNAUTHORIZED" });

    const { itemId } = req.body;
    if (!itemId) return res.status(400).json({ error: "MISSING_ITEM" });

    const item = await prisma.marketplaceItem.findUnique({ where: { id: itemId } });
    if (!item) return res.status(404).json({ error: "ITEM_NOT_FOUND" });

    const purchase = await prisma.purchase.create({
      data: {
        itemId,
        buyerId: req.user.id,
      },
      include: { item: true },
    });

    res.status(201).json({
      id: purchase.id,
      itemId: purchase.itemId,
      name: purchase.item?.title,
      createdAt: purchase.createdAt,
    });
  } catch (e) {
    console.error("❌ createPurchase error:", e);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
}

// 📑 Détail d’un achat
export async function getPurchase(req: Request, res: Response) {
  try {
    if (!req.user?.id) return res.status(401).json({ error: "UNAUTHORIZED" });

    const purchase = await prisma.purchase.findUnique({
      where: { id: req.params.id },
      include: { item: true },
    });

    if (!purchase || purchase.buyerId !== req.user.id) {
      return res.status(404).json({ error: "PURCHASE_NOT_FOUND" });
    }

    res.json({
      id: purchase.id,
      itemId: purchase.itemId,
      name: purchase.item?.title,
      createdAt: purchase.createdAt,
    });
  } catch (e) {
    console.error("❌ getPurchase error:", e);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
}

// ❌ Annuler un achat (optionnel)
export async function deletePurchase(req: Request, res: Response) {
  try {
    if (!req.user?.id) return res.status(401).json({ error: "UNAUTHORIZED" });

    const purchase = await prisma.purchase.findUnique({
      where: { id: req.params.id },
    });

    if (!purchase || purchase.buyerId !== req.user.id) {
      return res.status(404).json({ error: "PURCHASE_NOT_FOUND" });
    }

    await prisma.purchase.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) {
    console.error("❌ deletePurchase error:", e);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
}
