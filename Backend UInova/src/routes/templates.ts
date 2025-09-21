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
  help: "Nombre total de templates créés ou supprimés",
  labelNames: ["action"],
});

const histogramSchemaSize = new client.Histogram({
  name: "uinova_template_schema_size_bytes",
  help: "Taille estimée des schémas JSON des templates",
  buckets: [500, 2000, 10000, 50000, 200000], // ~0.5KB → 200KB
});

/* ============================================================================
 *  PUBLIC ROUTES – accessibles sans authentification
 * ========================================================================== */

/**
 * GET /api/templates
 * ▶️ Liste tous les templates (filtrés/paginés)
 * Query: ?q=...&page=1&pageSize=20&category=landing|dashboard&sort=asc|desc&tags=...
 */
router.get(
  "/",
  query("q").optional().isString().trim(),
  query("category").optional().isString(),
  query("sort").optional().isIn(["asc", "desc"]),
  query("status").optional().isIn(["draft", "published", "archived"]),
  query("tags").optional().isString(), // CSV de tags
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("pageSize").optional().isInt({ min: 1, max: 100 }).toInt(),
  handleValidationErrors,
  getAllTemplates
);

/**
 * GET /api/templates/:id
 * ▶️ Récupérer le détail d’un template public
 */
router.get(
  "/:id",
  param("id").isString().isLength({ min: 5 }),
  handleValidationErrors,
  getTemplateById
);

/* ============================================================================
 *  USER ROUTES – nécessite authentification
 * ========================================================================== */
router.use(authenticate);

/**
 * POST /api/templates
 * ▶️ Publier un template (USER: pour soi, ADMIN: pour tous)
 */
router.post(
  "/",
  body("name").isString().isLength({ min: 3, max: 100 }).withMessage("Nom invalide"),
  body("category").isString().isLength({ min: 3, max: 50 }).withMessage("Catégorie invalide"),
  body("schema").isObject().withMessage("Schema requis"),
  body("description").optional().isString().isLength({ max: 500 }),
  handleValidationErrors,
  async (req, res, next) => {
    const tpl = await publishTemplate(req, res);
    if (tpl) {
      counterTemplates.inc({ action: "created" });
      histogramSchemaSize.observe(JSON.stringify(req.body.schema).length);
      await auditLog.log(req.user?.id, "TEMPLATE_CREATED", { id: tpl.id, name: tpl.name });
      emitEvent("template.created", { userId: req.user?.id, id: tpl.id });
    }
    next;
  }
);

/**
 * PATCH /api/templates/:id
 * ▶️ Mettre à jour un template (auteur ou admin)
 */
router.patch(
  "/:id",
  param("id").isString().isLength({ min: 5 }),
  body("name").optional().isString().isLength({ min: 3, max: 100 }),
  body("category").optional().isString().isLength({ min: 3, max: 50 }),
  body("schema").optional().isObject(),
  body("description").optional().isString().isLength({ max: 500 }),
  handleValidationErrors,
  async (req, res, next) => {
    const tpl = await updateTemplate(req, res);
    if (tpl) {
      await auditLog.log(req.user?.id, "TEMPLATE_UPDATED", { id: tpl.id });
      emitEvent("template.updated", { userId: req.user?.id, id: tpl.id });
    }
    next;
  }
);

/**
 * DELETE /api/templates/:id
 * ▶️ Supprimer un template (auteur ou admin)
 */
router.delete(
  "/:id",
  param("id").isString().isLength({ min: 5 }),
  handleValidationErrors,
  async (req, res, next) => {
    const deleted = await deleteTemplate(req, res);
    if (deleted) {
      counterTemplates.inc({ action: "deleted" });
      await auditLog.log(req.user?.id, "TEMPLATE_DELETED", { id: req.params.id });
      emitEvent("template.deleted", { userId: req.user?.id, id: req.params.id });
    }
    next;
  }
);

/**
 * GET /api/templates/my
 * ▶️ Liste des templates publiés par l’utilisateur courant
 */
router.get("/my", listUserTemplates);

/**
 * POST /api/templates/:id/favorite
 * ▶️ Ajouter/retirer un template des favoris
 */
router.post(
  "/:id/favorite",
  param("id").isString().isLength({ min: 5 }),
  handleValidationErrors,
  async (req, res, next) => {
    const fav = await toggleFavoriteTemplate(req, res);
    await auditLog.log(req.user?.id, "TEMPLATE_FAVORITED", { id: req.params.id });
    emitEvent("template.favorited", { userId: req.user?.id, id: req.params.id });
    next;
  }
);

/* ============================================================================
 *  ADMIN ROUTES
 * ========================================================================== */

/**
 * GET /api/templates/admin/all
 * ▶️ Lister tous les templates (y compris privés/brouillons)
 */
router.get("/admin/all", authorize(["ADMIN"]), getAllTemplates);

export default router;
