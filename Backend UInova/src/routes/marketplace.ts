// src/routes/marketplace.ts
import { Router } from "express";
import { param } from "express-validator";
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

router.get("/my/items", withMetrics("myItems", listUserItems));

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

export default router;
