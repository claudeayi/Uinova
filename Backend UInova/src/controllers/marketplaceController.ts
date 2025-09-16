// src/controllers/marketplaceController.ts
import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { z } from "zod";
import { emitEvent } from "../services/eventBus";
import { logger } from "../utils/logger";
import client from "prom-client";

/* ============================================================================
 * 📊 Prometheus metrics
 * ========================================================================== */
const counterItemsPublished = new client.Counter({
  name: "uinova_marketplace_items_published_total",
  help: "Nombre total d’items publiés sur le marketplace",
});
const counterItemsDeleted = new client.Counter({
  name: "uinova_marketplace_items_deleted_total",
  help: "Nombre total d’items supprimés",
});
const counterPurchases = new client.Counter({
  name: "uinova_marketplace_purchases_total",
  help: "Nombre total d’achats réalisés",
});
const gaugeRevenue = new client.Gauge({
  name: "uinova_marketplace_revenue_cents",
  help: "Revenus cumulés (cents)",
});
const gaugeActiveSellers = new client.Gauge({
  name: "uinova_marketplace_active_sellers",
  help: "Nombre de vendeurs ayant publié au moins 1 item",
});

/* ============================================================================
 * Validation Schemas
 * ========================================================================== */
const PublishSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  priceCents: z.number().int().nonnegative().optional(),
  currency: z.string().length(3).default("EUR"),
  contentUrl: z.string().url(),
});
const UpdateSchema = PublishSchema.extend({
  published: z.boolean().optional(),
});
const PurchaseSchema = z.object({
  itemId: z.string().min(1),
});

/* ============================================================================
 * Helpers
 * ========================================================================== */
function getUser(req: Request) {
  return (req as any).user || {};
}

/* ============================================================================
 * Controllers CRUD Marketplace
 * ========================================================================== */

// ✅ GET /marketplace/items
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
        include: { owner: { select: { id: true, email: true, name: true } }, _count: { select: { purchases: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.marketplaceItem.count({ where }),
    ]);

    res.json({ success: true, data: items, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    logger.error("❌ listItems error", err);
    res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
}

// ✅ POST /marketplace/items
export async function publishItem(req: Request, res: Response) {
  try {
    const user = getUser(req);
    if (!user.id) return res.status(401).json({ success: false, error: "UNAUTHORIZED" });
    if (!["PREMIUM", "ADMIN"].includes(user.role)) return res.status(403).json({ success: false, error: "FORBIDDEN" });

    const parsed = PublishSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: "INVALID_BODY", details: parsed.error.flatten() });

    const item = await prisma.marketplaceItem.create({
      data: { ...parsed.data, ownerId: user.id, published: true },
    });

    await prisma.auditLog.create({
      data: { userId: user.id, action: "MARKETPLACE_PUBLISH", metadata: { itemId: item.id } },
    });
    emitEvent("marketplace.item.published", { itemId: item.id, userId: user.id });
    counterItemsPublished.inc();

    res.status(201).json({ success: true, data: item });
  } catch (err) {
    logger.error("❌ publishItem error", err);
    res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
}

// ✅ POST /marketplace/purchase
export async function purchaseItem(req: Request, res: Response) {
  try {
    const user = getUser(req);
    if (!user.id) return res.status(401).json({ success: false, error: "UNAUTHORIZED" });

    const parsed = PurchaseSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, error: "INVALID_BODY", details: parsed.error.flatten() });

    const { itemId } = parsed.data;
    const item = await prisma.marketplaceItem.findUnique({ where: { id: itemId } });
    if (!item) return res.status(404).json({ success: false, error: "NOT_FOUND" });

    const existing = await prisma.purchase.findFirst({ where: { itemId, buyerId: user.id } });
    if (existing) return res.json({ success: true, message: "Déjà acheté", downloadUrl: item.contentUrl });

    const purchase = await prisma.purchase.create({ data: { itemId, buyerId: user.id, status: "paid" } });

    await prisma.auditLog.create({ data: { userId: user.id, action: "MARKETPLACE_PURCHASE", metadata: { itemId } } });
    emitEvent("marketplace.item.purchased", { itemId, userId: user.id, purchaseId: purchase.id });
    counterPurchases.inc();

    // 💰 Mise à jour métriques financières
    const totalRevenue = await prisma.purchase.aggregate({ _sum: { item: { priceCents: true } } });
    gaugeRevenue.set(totalRevenue._sum?.item?.priceCents || 0);

    res.json({ success: true, message: "Achat réussi", item, downloadUrl: item.contentUrl, purchase });
  } catch (err) {
    logger.error("❌ purchaseItem error", err);
    res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
}

/* ============================================================================
 * 👑 ADMIN: Analytics & Stats
 * ========================================================================== */

// ✅ GET /marketplace/stats
export async function marketplaceStats(req: Request, res: Response) {
  try {
    const role = getUser(req).role;
    if (role !== "ADMIN") return res.status(403).json({ success: false, error: "FORBIDDEN" });

    const [totalItems, totalPurchases, totalRevenue, topSellers, topBuyers] = await Promise.all([
      prisma.marketplaceItem.count(),
      prisma.purchase.count(),
      prisma.purchase.aggregate({ _sum: { item: { priceCents: true } } }),
      prisma.purchase.groupBy({
        by: ["itemId"],
        _count: { itemId: true },
        orderBy: { _count: { itemId: "desc" } },
        take: 5,
      }),
      prisma.purchase.groupBy({
        by: ["buyerId"],
        _count: { buyerId: true },
        orderBy: { _count: { buyerId: "desc" } },
        take: 5,
      }),
    ]);

    gaugeActiveSellers.set(await prisma.marketplaceItem.groupBy({ by: ["ownerId"], _count: true }).then(r => r.length));

    res.json({
      success: true,
      data: {
        totalItems,
        totalPurchases,
        totalRevenueCents: totalRevenue._sum?.item?.priceCents || 0,
        topSellers,
        topBuyers,
      },
    });
  } catch (err) {
    logger.error("❌ marketplaceStats error", err);
    res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
}

// ✅ GET /marketplace/stats/export → CSV
export async function exportMarketplaceStats(req: Request, res: Response) {
  try {
    const role = getUser(req).role;
    if (role !== "ADMIN") return res.status(403).json({ success: false, error: "FORBIDDEN" });

    const purchases = await prisma.purchase.findMany({ include: { item: true, buyer: true } });

    const rows = purchases.map(p => [
      p.id,
      p.item.title,
      p.item.priceCents,
      p.item.currency,
      p.buyer?.email,
      p.createdAt.toISOString(),
    ]);
    const header = "id,title,price,currency,buyer,createdAt";
    const csv = [header, ...rows.map(r => r.join(","))].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=marketplace_stats.csv");
    res.send(csv);
  } catch (err) {
    logger.error("❌ exportMarketplaceStats error", err);
    res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
}

/* ============================================================================
 * 🔴 SSE Live Streaming (events)
 * ========================================================================== */
export async function streamMarketplaceEvents(req: Request, res: Response) {
  try {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const send = (event: string, data: any) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Exemple: notifier achat/publication
    emitEvent("marketplace.stream.connected", { ts: Date.now() });
    send("connected", { ts: Date.now(), status: "ready" });

    const interval = setInterval(() => send("heartbeat", { ts: Date.now() }), 15000);

    req.on("close", () => {
      clearInterval(interval);
      logger.info("🔌 SSE client disconnected");
    });
  } catch (err) {
    logger.error("❌ streamMarketplaceEvents error", err);
    res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
}
