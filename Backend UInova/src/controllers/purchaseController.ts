// src/controllers/purchaseController.ts
import { Request, Response } from "express";
import { prisma } from "../utils/prisma";

/* ============================================================================
 *  PURCHASE CONTROLLER – Gestion des achats marketplace
 * ========================================================================== */

// 📂 Liste des achats de l’utilisateur connecté
export async function listPurchases(req: Request, res: Response) {
  try {
    if (!req.user?.id) return res.status(401).json({ success: false, error: "UNAUTHORIZED" });

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const status = req.query.status as string | undefined;

    const where: any = { buyerId: req.user.id };
    if (status) where.status = status;

    const [purchases, total] = await Promise.all([
      prisma.purchase.findMany({
        where,
        include: { item: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.purchase.count({ where }),
    ]);

    res.json({
      success: true,
      data: purchases.map((p) => ({
        id: p.id,
        itemId: p.itemId,
        type: p.item?.type || "unknown",
        name: p.item?.title || "Item inconnu",
        status: p.status || "paid",
        createdAt: p.createdAt,
      })),
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (e: any) {
    console.error("❌ listPurchases error:", e);
    res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
}

// ➕ Créer un achat (après paiement validé)
export async function createPurchase(req: Request, res: Response) {
  try {
    if (!req.user?.id) return res.status(401).json({ success: false, error: "UNAUTHORIZED" });

    const { itemId } = req.body;
    if (!itemId) return res.status(400).json({ success: false, error: "MISSING_ITEM" });

    const item = await prisma.marketplaceItem.findUnique({ where: { id: itemId } });
    if (!item) return res.status(404).json({ success: false, error: "ITEM_NOT_FOUND" });

    const purchase = await prisma.purchase.create({
      data: {
        itemId,
        buyerId: req.user.id,
        status: "paid", // statut initial
      },
      include: { item: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "PURCHASE_CREATED",
        details: `Item ${itemId} acheté`,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: purchase.id,
        itemId: purchase.itemId,
        name: purchase.item?.title,
        status: purchase.status,
        createdAt: purchase.createdAt,
      },
    });
  } catch (e: any) {
    console.error("❌ createPurchase error:", e);
    res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
}

// 📑 Détail d’un achat
export async function getPurchase(req: Request, res: Response) {
  try {
    if (!req.user?.id) return res.status(401).json({ success: false, error: "UNAUTHORIZED" });

    const purchase = await prisma.purchase.findUnique({
      where: { id: req.params.id },
      include: { item: true },
    });

    if (!purchase || purchase.buyerId !== req.user.id) {
      return res.status(404).json({ success: false, error: "PURCHASE_NOT_FOUND" });
    }

    res.json({
      success: true,
      data: {
        id: purchase.id,
        itemId: purchase.itemId,
        name: purchase.item?.title,
        status: purchase.status,
        createdAt: purchase.createdAt,
      },
    });
  } catch (e: any) {
    console.error("❌ getPurchase error:", e);
    res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
}

// ❌ Annuler / supprimer un achat
export async function deletePurchase(req: Request, res: Response) {
  try {
    if (!req.user?.id) return res.status(401).json({ success: false, error: "UNAUTHORIZED" });

    const purchase = await prisma.purchase.findUnique({ where: { id: req.params.id } });
    if (!purchase || purchase.buyerId !== req.user.id) {
      return res.status(404).json({ success: false, error: "PURCHASE_NOT_FOUND" });
    }

    await prisma.purchase.update({
      where: { id: req.params.id },
      data: { status: "cancelled", cancelledAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "PURCHASE_CANCELLED",
        details: `Purchase ${req.params.id} annulé`,
      },
    });

    res.json({ success: true, message: "Achat annulé" });
  } catch (e: any) {
    console.error("❌ deletePurchase error:", e);
    res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
}
