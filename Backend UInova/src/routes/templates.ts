// src/routes/templates.ts
import { Router } from "express";
import { body, param, query } from "express-validator";
import { authenticate, authorize } from "../middlewares/security";
import { handleValidationErrors } from "../middlewares/validate";
import { auditLog } from "../services/auditLogService";
import { emitEvent } from "../services/eventBus";
import client from "prom-client";

import {
  getAllTemplates,
  getTemplateById,
  publishTemplate,
  updateTemplate,
  deleteTemplate,
  listUserTemplates,
  toggleFavoriteTemplate,
} from "../controllers/templateController";

const router = Router();

/* ============================================================================
 * 📊 Metrics Prometheus
 * ========================================================================== */
const counterTemplates = new client.Counter({
  name: "uinova_templates_total",
  help: "Nombre total d’actions sur les templates",
  labelNames: ["action", "status"],
});

const histogramSchemaSize = new client.Histogram({
  name: "uinova_template_schema_size_bytes",
  help: "Taille estimée des schémas JSON des templates",
  buckets: [500, 2000, 10000, 50000, 200000], // ~0.5KB → 200KB
});

/* ============================================================================
 *  PUBLIC ROUTES
 * ========================================================================== */
router.get(
  "/",
  query("q").optional().isString().trim(),
  query("category").optional().isString(),
  query("sort").optional().isIn(["asc", "desc"]),
  query("status").optional().isIn(["draft", "published", "archived"]),
  query("tags").optional().isString(),
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("pageSize").optional().isInt({ min: 1, max: 100 }).toInt(),
  handleValidationErrors,
  getAllTemplates
);

router.get(
  "/:id",
  param("id").isString().isLength({ min: 5 }),
  handleValidationErrors,
  getTemplateById
);

/* ============================================================================
 *  USER ROUTES – Auth Required
 * ========================================================================== */
router.use(authenticate);

router.post(
  "/",
  body("name").isString().isLength({ min: 3, max: 100 }),
  body("category").isString().isLength({ min: 3, max: 50 }),
  body("schema").isObject(),
  body("description").optional().isString().isLength({ max: 500 }),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const tpl = await publishTemplate(req, res, next);
      if (tpl) {
        counterTemplates.inc({ action: "create", status: "success" });
        histogramSchemaSize.observe(JSON.stringify(req.body.schema).length);
        await auditLog.log(req.user?.id, "TEMPLATE_CREATED", { id: tpl.id, name: tpl.name });
        emitEvent("template.created", { userId: req.user?.id, id: tpl.id });
      }
    } catch (err) {
      counterTemplates.inc({ action: "create", status: "error" });
      throw err;
    }
  }
);

router.patch(
  "/:id",
  param("id").isString().isLength({ min: 5 }),
  body("name").optional().isString().isLength({ min: 3, max: 100 }),
  body("category").optional().isString().isLength({ min: 3, max: 50 }),
  body("schema").optional().isObject(),
  body("description").optional().isString().isLength({ max: 500 }),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const tpl = await updateTemplate(req, res, next);
      if (tpl) {
        counterTemplates.inc({ action: "update", status: "success" });
        await auditLog.log(req.user?.id, "TEMPLATE_UPDATED", { id: tpl.id });
        emitEvent("template.updated", { userId: req.user?.id, id: tpl.id });
      }
    } catch (err) {
      counterTemplates.inc({ action: "update", status: "error" });
      throw err;
    }
  }
);

router.delete(
  "/:id",
  param("id").isString().isLength({ min: 5 }),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const deleted = await deleteTemplate(req, res, next);
      if (deleted) {
        counterTemplates.inc({ action: "delete", status: "success" });
        await auditLog.log(req.user?.id, "TEMPLATE_DELETED", { id: req.params.id });
        emitEvent("template.deleted", { userId: req.user?.id, id: req.params.id });
      }
    } catch (err) {
      counterTemplates.inc({ action: "delete", status: "error" });
      throw err;
    }
  }
);

router.get("/my", listUserTemplates);

router.post(
  "/:id/favorite",
  param("id").isString().isLength({ min: 5 }),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const fav = await toggleFavoriteTemplate(req, res, next);
      counterTemplates.inc({ action: "favorite", status: "success" });
      await auditLog.log(req.user?.id, "TEMPLATE_FAVORITED", { id: req.params.id });
      emitEvent("template.favorited", { userId: req.user?.id, id: req.params.id });
      return fav;
    } catch (err) {
      counterTemplates.inc({ action: "favorite", status: "error" });
      throw err;
    }
  }
);

/* ============================================================================
 *  ADMIN ROUTES
 * ========================================================================== */
router.get("/admin/all", authorize(["ADMIN"]), getAllTemplates);

export default router; // enrichi sans rien enlever
