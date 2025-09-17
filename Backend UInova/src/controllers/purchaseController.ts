// src/controllers/purchaseController.ts
import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { Parser as Json2csvParser } from "json2csv";

/* ============================================================================
 *  PURCHASE CONTROLLER – Gestion complète des achats marketplace
 * ========================================================================== */

// 📂 Liste des achats de l’utilisateur connecté (filtrage avancé)
export async function listPurchases(req: Request, res: Response) {
  try {
    if (!(req as any).user?.id) return res.status(401).json({ success: false, error: "UNAUTHORIZED" });

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const { status, itemType, dateFrom, dateTo } = req.query;

    const where: any = { buyerId: (req as any).user.id };
    if (status) where.status = String(status);
    if (itemType) where.item = { type: String(itemType) };
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(String(dateFrom));
      if (dateTo) where.createdAt.lte = new Date(String(dateTo));
    }

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
        priceCents: p.item?.priceCents || 0,
        currency: p.item?.currency || "EUR",
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
    if (!(req as any).user?.id) return res.status(401).json({ success: false, error: "UNAUTHORIZED" });

    const { itemId } = req.body;
    if (!itemId) return res.status(400).json({ success: false, error: "MISSING_ITEM" });

    const item = await prisma.marketplaceItem.findUnique({ where: { id: itemId } });
    if (!item) return res.status(404).json({ success: false, error: "ITEM_NOT_FOUND" });

    const purchase = await prisma.purchase.create({
      data: {
        itemId,
        buyerId: (req as any).user.id,
        status: "paid",
      },
      include: { item: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: (req as any).user.id,
        action: "PURCHASE_CREATED",
        details: `Item ${itemId} acheté`,
        ip: req.ip,
        ua: req.headers["user-agent"],
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: purchase.id,
        itemId: purchase.itemId,
        name: purchase.item?.title,
        status: purchase.status,
        priceCents: purchase.item?.priceCents,
        currency: purchase.item?.currency,
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
    if (!(req as any).user?.id) return res.status(401).json({ success: false, error: "UNAUTHORIZED" });

    const purchase = await prisma.purchase.findUnique({
      where: { id: req.params.id },
      include: { item: true },
    });

    if (!purchase || purchase.buyerId !== (req as any).user.id) {
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
        priceCents: purchase.item?.priceCents,
        currency: purchase.item?.currency,
      },
    });
  } catch (e: any) {
    console.error("❌ getPurchase error:", e);
    res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
}

// ❌ Annuler un achat (soft cancel)
export async function deletePurchase(req: Request, res: Response) {
  try {
    if (!(req as any).user?.id) return res.status(401).json({ success: false, error: "UNAUTHORIZED" });

    const purchase = await prisma.purchase.findUnique({ where: { id: req.params.id } });
    if (!purchase || purchase.buyerId !== (req as any).user.id) {
      return res.status(404).json({ success: false, error: "PURCHASE_NOT_FOUND" });
    }

    await prisma.purchase.update({
      where: { id: req.params.id },
      data: { status: "cancelled", cancelledAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        userId: (req as any).user.id,
        action: "PURCHASE_CANCELLED",
        details: `Purchase ${req.params.id} annulé`,
        ip: req.ip,
      },
    });

    res.json({ success: true, message: "Achat annulé" });
  } catch (e: any) {
    console.error("❌ deletePurchase error:", e);
    res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
}

// 💸 Rembourser un achat
export async function refundPurchase(req: Request, res: Response) {
  try {
    const role = (req as any).user?.role;
    if (role !== "ADMIN") return res.status(403).json({ success: false, error: "FORBIDDEN" });

    const { id } = req.params;
    const purchase = await prisma.purchase.update({
      where: { id },
      data: { status: "refunded", refundedAt: new Date() },
      include: { item: true, buyer: true },
    });

    res.json({ success: true, message: "Achat remboursé", data: purchase });
  } catch (e: any) {
    console.error("❌ refundPurchase error:", e);
    res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
}

// 🛠️ Admin – liste complète
export async function listAllPurchases(req: Request, res: Response) {
  try {
    if ((req as any).user?.role !== "ADMIN") {
      return res.status(403).json({ success: false, error: "FORBIDDEN" });
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const [purchases, total] = await Promise.all([
      prisma.purchase.findMany({
        include: { item: true, buyer: { select: { id: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.purchase.count(),
    ]);

    res.json({
      success: true,
      data: purchases,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (e: any) {
    console.error("❌ listAllPurchases error:", e);
    res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
}

// 📤 Exporter les achats (JSON / CSV)
export async function exportPurchases(req: Request, res: Response) {
  try {
    if ((req as any).user?.role !== "ADMIN") {
      return res.status(403).json({ success: false, error: "FORBIDDEN" });
    }

    const format = (req.query.format as string) || "json";
    const purchases = await prisma.purchase.findMany({
      include: { item: true, buyer: { select: { id: true, email: true } } },
    });

    if (format === "csv") {
      const parser = new Json2csvParser({ fields: ["id", "buyer.email", "item.title", "status", "createdAt"] });
      const csv = parser.parse(purchases);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=purchases.csv");
      res.send(csv);
    } else {
      res.json({ success: true, data: purchases });
    }
  } catch (e: any) {
    console.error("❌ exportPurchases error:", e);
    res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
}

// 📊 Stats utilisateur
export async function getUserPurchaseStats(req: Request, res: Response) {
  try {
    if (!(req as any).user?.id) return res.status(401).json({ success: false, error: "UNAUTHORIZED" });

    const [count, totalSpent] = await Promise.all([
      prisma.purchase.count({ where: { buyerId: (req as any).user.id, status: "paid" } }),
      prisma.purchase.aggregate({
        where: { buyerId: (req as any).user.id, status: "paid" },
        _sum: { item: { select: { priceCents: true } } } as any,
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalPurchases: count,
        totalSpentCents: totalSpent?._sum?.priceCents || 0,
      },
    });
  } catch (e: any) {
    console.error("❌ getUserPurchaseStats error:", e);
    res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
}
