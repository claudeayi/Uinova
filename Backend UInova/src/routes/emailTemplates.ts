// src/routes/emailTemplates.ts
import { Router } from "express";
import { body, param } from "express-validator";
import {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  previewTemplate,
} from "../controllers/emailTemplateController";
import { authenticate, authorize } from "../middlewares/security";
import { handleValidationErrors } from "../middlewares/validate";
import { prisma } from "../utils/prisma";
import { emitEvent } from "../services/eventBus";
import client from "prom-client";

const router = Router();

/* ============================================================================
 * 📊 Metrics
 * ========================================================================== */
const counterEmailTemplates = new client.Counter({
  name: "uinova_email_templates_total",
  help: "Nombre de templates email gérés",
  labelNames: ["action"],
});

const histogramEmailLatency = new client.Histogram({
  name: "uinova_email_template_latency_ms",
  help: "Latence des opérations sur les templates email",
  labelNames: ["action"],
  buckets: [20, 50, 100, 200, 500, 1000, 2000],
});

/* ============================================================================
 * EMAIL TEMPLATE ROUTES – ADMIN ONLY
 * ========================================================================== */
router.use(authenticate, authorize(["ADMIN"]));

/**
 * GET /api/admin/email-templates
 * 📋 Liste tous les templates disponibles
 */
router.get("/", listTemplates);

/**
 * GET /api/admin/email-templates/:id
 * 🔎 Détail d’un template par ID
 */
router.get(
  "/:id",
  param("id").isString().isLength({ min: 10 }).withMessage("ID invalide"),
  handleValidationErrors,
  getTemplate
);

/**
 * POST /api/admin/email-templates
 * 🆕 Créer un nouveau template email
 */
router.post(
  "/",
  body("code")
    .isString()
    .isLength({ min: 3, max: 50 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage("Code invalide (lettres, chiffres, _ et - autorisés)")
    .trim(),
  body("name").isString().isLength({ min: 3, max: 100 }).trim(),
  body("subject").isString().isLength({ min: 3, max: 200 }).trim(),
  body("bodyHtml").isString().isLength({ min: 3 }),
  body("bodyText").optional().isString(),
  body("lang").optional().isString().isLength({ min: 2, max: 5 }).trim(),
  handleValidationErrors,
  async (req, res, next) => {
    const start = Date.now();
    try {
      await createTemplate(req, res);

      await prisma.auditLog.create({
        data: {
          userId: req.user?.id,
          action: "EMAIL_TEMPLATE_CREATED",
          metadata: { code: req.body.code, name: req.body.name },
        },
      });

      emitEvent("email.template.created", { code: req.body.code });

      counterEmailTemplates.inc({ action: "created" });
      histogramEmailLatency.labels("created").observe(Date.now() - start);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/admin/email-templates/:id
 * ✏️ Mettre à jour un template existant
 */
router.put(
  "/:id",
  param("id").isString().isLength({ min: 10 }),
  body("name").optional().isString().isLength({ min: 3, max: 100 }),
  body("subject").optional().isString().isLength({ min: 3, max: 200 }),
  body("bodyHtml").optional().isString().isLength({ min: 3 }),
  body("bodyText").optional().isString(),
  body("lang").optional().isString().isLength({ min: 2, max: 5 }),
  handleValidationErrors,
  async (req, res, next) => {
    const start = Date.now();
    try {
      await updateTemplate(req, res);

      await prisma.auditLog.create({
        data: {
          userId: req.user?.id,
          action: "EMAIL_TEMPLATE_UPDATED",
          metadata: { id: req.params.id, changes: req.body },
        },
      });

      emitEvent("email.template.updated", { id: req.params.id });

      counterEmailTemplates.inc({ action: "updated" });
      histogramEmailLatency.labels("updated").observe(Date.now() - start);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/admin/email-templates/:id
 * 🗑️ Supprimer un template
 */
router.delete(
  "/:id",
  param("id").isString().isLength({ min: 10 }),
  handleValidationErrors,
  async (req, res, next) => {
    const start = Date.now();
    try {
      await deleteTemplate(req, res);

      await prisma.auditLog.create({
        data: {
          userId: req.user?.id,
          action: "EMAIL_TEMPLATE_DELETED",
          metadata: { id: req.params.id },
        },
      });

      emitEvent("email.template.deleted", { id: req.params.id });

      counterEmailTemplates.inc({ action: "deleted" });
      histogramEmailLatency.labels("deleted").observe(Date.now() - start);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/admin/email-templates/:id/preview
 * 👀 Générer un rendu preview d’un template
 */
router.post(
  "/:id/preview",
  param("id").isString().isLength({ min: 10 }),
  body("variables").optional().isObject(),
  handleValidationErrors,
  async (req, res, next) => {
    const start = Date.now();
    try {
      await previewTemplate(req, res);

      await prisma.auditLog.create({
        data: {
          userId: req.user?.id,
          action: "EMAIL_TEMPLATE_PREVIEW",
          metadata: { id: req.params.id, variables: req.body.variables || {} },
        },
      });

      emitEvent("email.template.previewed", { id: req.params.id });

      counterEmailTemplates.inc({ action: "previewed" });
      histogramEmailLatency.labels("previewed").observe(Date.now() - start);
    } catch (err) {
      next(err);
    }
  }
);

/* ============================================================================
 * 🩺 Health Check
 * ========================================================================== */
router.get("/health", (_req, res) =>
  res.json({
    ok: true,
    service: "email-templates",
    version: process.env.EMAIL_TEMPLATES_VERSION || "1.0.0",
    ts: Date.now(),
  })
);

export default router;
