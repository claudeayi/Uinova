// src/routes/marketplace.ts
import { Router } from "express";
import { param, query } from "express-validator";
import {
  listItems,
  getItem,
  publishItem,
  purchaseItem,
  updateItem,
  deleteItem,
  listUserItems,
  adminValidateItem,
  adminListItems,
  adminDeleteItem,
} from "../controllers/marketplaceController";
import { authenticate, authorize } from "../middlewares/security";
import { validateBody, validateQuery } from "../middlewares/validator";
import { handleValidationErrors } from "../middlewares/validate";
import {
  publishItemSchema,
  purchaseSchema,
  listItemsQuerySchema,
} from "../validators/marketplace.schema";

import { auditLog } from "../services/auditLogService";
import { emitEvent } from "../services/eventBus";
import client from "prom-client";
import { prisma } from "../utils/prisma";

const router = Router();

/* ============================================================================
 * 📊 Prometheus Metrics
 * ========================================================================== */
const counterMarketplace = new client.Counter({
  name: "uinova_marketplace_total",
  help: "Nombre total d’opérations marketplace",
  labelNames: ["action"],
});

const histogramMarketplace = new client.Histogram({
  name: "uinova_marketplace_latency_ms",
  help: "Latence des opérations marketplace",
  labelNames: ["action"],
  buckets: [20, 50, 100, 200, 500, 1000, 2000],
});

function withMetrics(action: string, handler: any) {
  return async (req: any, res: any, next: any) => {
    const start = Date.now();
    try {
      const result = await handler(req, res, next);
      counterMarketplace.inc({ action });
      histogramMarketplace.labels(action).observe(Date.now() - start);
      return result;
    } catch (err) {
      histogramMarketplace.labels(action).observe(Date.now() - start);
      throw err;
    }
  };
}

/* ============================================================================
 *  ROUTES PUBLIQUES – accessibles sans authentification
 * ========================================================================== */
router.get("/items", validateQuery(listItemsQuerySchema), withMetrics("list", listItems));

router.get(
  "/items/:id",
  param("id").isString().isLength({ min: 5 }).withMessage("ID invalide"),
  handleValidationErrors,
  withMetrics("get", getItem)
);

/* ============================================================================
 *  ROUTES UTILISATEUR – nécessite authentification
 * ========================================================================== */
router.use(authenticate);

/**
 * POST /api/marketplace/items
 * ▶️ Publier un item marketplace
 */
router.post(
  "/items",
  validateBody(publishItemSchema),
  withMetrics("publish", async (req, res, next) => {
    const result = await publishItem(req, res, next);
    await auditLog.log(req.user?.id, "MARKETPLACE_ITEM_PUBLISHED", req.body);
    emitEvent("marketplace.item.published", { userId: req.user?.id, ...req.body });
    return result;
  })
);

/**
 * PATCH /api/marketplace/items/:id
 * ▶️ Mettre à jour son propre item
 */
router.patch(
  "/items/:id",
  param("id").isString().isLength({ min: 5 }),
  handleValidationErrors,
  validateBody(publishItemSchema.partial()),
  withMetrics("update", async (req, res, next) => {
    const result = await updateItem(req, res, next);
    await auditLog.log(req.user?.id, "MARKETPLACE_ITEM_UPDATED", { id: req.params.id });
    emitEvent("marketplace.item.updated", { userId: req.user?.id, id: req.params.id });
    return result;
  })
);

/**
 * DELETE /api/marketplace/items/:id
 * ▶️ Supprimer son propre item
 */
router.delete(
  "/items/:id",
  param("id").isString().isLength({ min: 5 }),
  handleValidationErrors,
  withMetrics("delete", async (req, res, next) => {
    const result = await deleteItem(req, res, next);
    await auditLog.log(req.user?.id, "MARKETPLACE_ITEM_DELETED", { id: req.params.id });
    emitEvent("marketplace.item.deleted", { userId: req.user?.id, id: req.params.id });
    return result;
  })
);

/**
 * GET /api/marketplace/my/items
 * ▶️ Liste des items de l’utilisateur connecté
 */
router.get("/my/items", withMetrics("myItems", listUserItems));

/**
 * POST /api/marketplace/purchase
 * ▶️ Acheter un item
 */
router.post(
  "/purchase",
  validateBody(purchaseSchema),
  withMetrics("purchase", async (req, res, next) => {
    const result = await purchaseItem(req, res, next);
    await auditLog.log(req.user?.id, "MARKETPLACE_ITEM_PURCHASED", req.body);
    emitEvent("marketplace.item.purchased", { userId: req.user?.id, ...req.body });
    return result;
  })
);

/* ============================================================================
 *  ✅ NOUVELLES ROUTES UTILISATEUR – Purchases, Favoris, Historique
 * ========================================================================== */

/**
 * GET /api/marketplace/my/purchases
 * ▶️ Historique d’achats marketplace de l’utilisateur
 * Query: ?page=1&pageSize=20&status=&provider=&from=&to=
 * (Proxy logique du domaine marketplace vers la table `purchase`)
 */
router.get(
  "/my/purchases",
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("pageSize").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("status").optional().isIn(["PENDING", "PAID", "CANCELLED", "REFUNDED"]),
  query("provider").optional().isIn(["STRIPE", "PAYPAL", "CINETPAY", "MOCK"]),
  query("from").optional().isISO8601().toDate(),
  query("to").optional().isISO8601().toDate(),
  handleValidationErrors,
  withMetrics("myPurchases", async (req, res) => {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;
    const where: any = { userId: req.user!.id };

    if (req.query.status) where.status = req.query.status;
    if (req.query.provider) where.provider = req.query.provider;
    if (req.query.from || req.query.to) {
      where.createdAt = {};
      if (req.query.from) where.createdAt.gte = new Date(String(req.query.from));
      if (req.query.to) where.createdAt.lte = new Date(String(req.query.to));
    }

    const [total, items] = await Promise.all([
      prisma.purchase.count({ where }),
      prisma.purchase.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          item: { select: { id: true, name: true, type: true, price: true } },
        } as any,
      }),
    ]);

    await auditLog.log(req.user!.id, "MARKETPLACE_MY_PURCHASES_LISTED", { page, pageSize });
    emitEvent("marketplace.my.purchases.listed", { userId: req.user!.id, page, pageSize });

    res.json({
      success: true,
      data: items,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) || 1 },
    });
  })
);

/**
 * POST /api/marketplace/items/:id/favorite
 * ▶️ Ajouter un item marketplace aux favoris
 */
router.post(
  "/items/:id/favorite",
  param("id").isString().isLength({ min: 5 }),
  handleValidationErrors,
  withMetrics("favorite_add", async (req, res) => {
    const { id } = req.params;
    const item = await prisma.marketplaceItem.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ success: false, error: "ITEM_NOT_FOUND" });

    const fav = await prisma.favorite.upsert({
      where: {
        userId_itemId_type: {
          userId: req.user!.id,
          itemId: id,
          type: item.type || "marketplace",
        } as any,
      },
      update: {},
      create: {
        userId: req.user!.id,
        itemId: id,
        type: (item.type as any) || "marketplace",
      },
    });

    await auditLog.log(req.user!.id, "MARKETPLACE_FAVORITE_ADDED", { itemId: id, type: item.type || "marketplace" });
    emitEvent("marketplace.favorite.added", { userId: req.user!.id, itemId: id, type: item.type || "marketplace" });

    res.status(201).json({ success: true, data: fav });
  })
);

/**
 * DELETE /api/marketplace/items/:id/favorite
 * ▶️ Retirer un item marketplace des favoris
 */
router.delete(
  "/items/:id/favorite",
  param("id").isString().isLength({ min: 5 }),
  handleValidationErrors,
  withMetrics("favorite_remove", async (req, res) => {
    const { id } = req.params;
    // Tente de détecter le type depuis l’item pour être robuste
    const item = await prisma.marketplaceItem.findUnique({ where: { id } });
    const type = (item?.type as any) || "marketplace";

    const deleted = await prisma.favorite.deleteMany({
      where: { userId: req.user!.id, itemId: id, type },
    });

    await auditLog.log(req.user!.id, "MARKETPLACE_FAVORITE_REMOVED", { itemId: id, type });
    emitEvent("marketplace.favorite.removed", { userId: req.user!.id, itemId: id, type });

    res.json({ success: true, removed: deleted.count });
  })
);

/**
 * GET /api/marketplace/my/history
 * ▶️ Historique des actions marketplace de l’utilisateur (audit trail)
 */
router.get(
  "/my/history",
  query("limit").optional().isInt({ min: 1, max: 200 }).toInt(),
  handleValidationErrors,
  withMetrics("myHistory", async (req, res) => {
    const limit = Number(req.query.limit) || 100;

    const logs = await prisma.auditLog.findMany({
      where: {
        userId: req.user!.id,
        action: {
          in: [
            "MARKETPLACE_ITEM_PUBLISHED",
            "MARKETPLACE_ITEM_UPDATED",
            "MARKETPLACE_ITEM_DELETED",
            "MARKETPLACE_ITEM_PURCHASED",
            "MARKETPLACE_FAVORITE_ADDED",
            "MARKETPLACE_FAVORITE_REMOVED",
          ],
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    await auditLog.log(req.user!.id, "MARKETPLACE_MY_HISTORY_VIEWED", { limit });
    emitEvent("marketplace.my.history.viewed", { userId: req.user!.id, limit });

    res.json({ success: true, data: logs });
  })
);

/* ============================================================================
 *  ROUTES ADMIN – nécessite rôle administrateur
 * ========================================================================== */
router.get("/admin/items", authorize(["ADMIN"]), withMetrics("adminList", adminListItems));

router.post(
  "/admin/items/:id/validate",
  authorize(["ADMIN"]),
  param("id").isString().isLength({ min: 5 }),
  handleValidationErrors,
  withMetrics("adminValidate", async (req, res, next) => {
    const result = await adminValidateItem(req, res, next);
    await auditLog.log(req.user?.id, "MARKETPLACE_ITEM_VALIDATED", { id: req.params.id });
    emitEvent("marketplace.item.validated", { userId: req.user?.id, id: req.params.id });
    return result;
  })
);

router.delete(
  "/admin/items/:id",
  authorize(["ADMIN"]),
  param("id").isString().isLength({ min: 5 }),
  handleValidationErrors,
  withMetrics("adminDelete", async (req, res, next) => {
    const result = await adminDeleteItem(req, res, next);
    await auditLog.log(req.user?.id, "MARKETPLACE_ITEM_DELETED_ADMIN", { id: req.params.id });
    emitEvent("marketplace.item.deleted.admin", { userId: req.user?.id, id: req.params.id });
    return result;
  })
);

/**
 * GET /api/marketplace/admin/overview
 * ▶️ Vue d’ensemble marketplace (stats globales)
 */
router.get(
  "/admin/overview",
  authorize(["ADMIN"]),
  withMetrics("adminOverview", async (_req, res) => {
    const [totalItems, templatesCount, avgPriceAgg, totalPurchases, revenueAgg, favoritesCount] =
      await Promise.all([
        prisma.marketplaceItem.count(),
        prisma.marketplaceItem.count({ where: { type: "template" } }),
        prisma.marketplaceItem.aggregate({ _avg: { price: true } }),
        prisma.purchase.count(),
        prisma.purchase.aggregate({ _sum: { amount: true } }),
        prisma.favorite.count({ where: { type: { in: ["template", "marketplace"] } as any } }),
      ]);

    const data = {
      totalItems,
      templatesCount,
      averagePrice: Number(avgPriceAgg._avg.price || 0),
      totalPurchases,
      totalRevenue: Number(revenueAgg._sum.amount || 0),
      favoritesCount,
      ts: Date.now(),
    };

    res.json({ success: true, data });
  })
);

/* ============================================================================
 *  HEALTHCHECK
 * ========================================================================== */
router.get(
  "/health",
  withMetrics("health", async (_req, res) => {
    res.json({
      ok: true,
      service: "marketplace",
      version: process.env.MARKETPLACE_VERSION || "1.0.0",
      ts: Date.now(),
    });
  })
);

export default router;
