// src/routes/webhooks.ts
import { Router } from "express";
import { authenticate, authorize } from "../middlewares/security";
import { registerWebhook, listWebhooks, removeWebhook } from "../services/eventBus";
import { body, param, query } from "express-validator";
import { handleValidationErrors } from "../middlewares/validate";
import { prisma } from "../utils/prisma";
import { emitEvent } from "../services/eventBus";
import client from "prom-client";

const router = Router();

/* ============================================================================
 * 📊 Prometheus Metrics
 * ========================================================================== */
const counterWebhooks = new client.Counter({
  name: "uinova_webhooks_total",
  help: "Nombre total d’opérations webhook",
  labelNames: ["action", "status"],
});

const histogramWebhookLatency = new client.Histogram({
  name: "uinova_webhook_latency_ms",
  help: "Latence des opérations webhooks",
  buckets: [50, 100, 200, 500, 1000, 5000],
});

/* ============================================================================
 * WEBHOOK ROUTES – Auth Required
 * ========================================================================== */
router.use(authenticate);

/**
 * POST /api/webhooks/register
 * ➝ Enregistrer un webhook externe (event + url)
 */
router.post(
  "/register",
  body("url").isURL().withMessage("URL de webhook invalide"),
  body("event").isString().isLength({ min: 3, max: 50 }),
  body("secret").optional().isString().isLength({ min: 10, max: 100 }),
  handleValidationErrors,
  async (req, res) => {
    const start = Date.now();
    try {
      const user = (req as any).user;
      const { url, event, secret } = req.body;

      const webhook = await registerWebhook(user.id, url, event, secret);

      await prisma.auditLog.create({
        data: { userId: user.id, action: "WEBHOOK_REGISTER", metadata: { url, event } },
      });

      emitEvent("webhook.registered", { userId: user.id, id: webhook.id, event });

      counterWebhooks.inc({ action: "register", status: "success" });
      histogramWebhookLatency.observe(Date.now() - start);

      res.status(201).json({ success: true, message: "Webhook enregistré", data: webhook });
    } catch (err: any) {
      counterWebhooks.inc({ action: "register", status: "failed" });
      console.error("❌ registerWebhook error:", err);
      res.status(500).json({ success: false, message: "Erreur enregistrement webhook" });
    }
  }
);

/**
 * GET /api/webhooks
 * ➝ Lister mes webhooks (paginé)
 */
router.get(
  "/",
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("pageSize").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("event").optional().isString(),
  handleValidationErrors,
  async (req, res) => {
    const start = Date.now();
    try {
      const user = (req as any).user;
      const page = Number(req.query.page) || 1;
      const pageSize = Number(req.query.pageSize) || 20;
      const event = req.query.event as string | undefined;

      const [total, hooks] = await Promise.all([
        prisma.webhook.count({ where: { userId: user.id, ...(event ? { event } : {}) } }),
        listWebhooks(user.id, { page, pageSize, event }),
      ]);

      await prisma.auditLog.create({
        data: { userId: user.id, action: "WEBHOOK_LIST", metadata: { page, pageSize, event } },
      });

      counterWebhooks.inc({ action: "list", status: "success" });
      histogramWebhookLatency.observe(Date.now() - start);

      res.json({
        success: true,
        data: hooks,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      });
    } catch (err: any) {
      counterWebhooks.inc({ action: "list", status: "failed" });
      console.error("❌ listWebhooks error:", err);
      res.status(500).json({ success: false, message: "Erreur récupération webhooks" });
    }
  }
);

/**
 * DELETE /api/webhooks/:id
 * ➝ Supprimer un webhook
 */
router.delete(
  "/:id",
  param("id").isString().withMessage("ID invalide"),
  handleValidationErrors,
  async (req, res) => {
    const start = Date.now();
    try {
      const user = (req as any).user;
      const { id } = req.params;

      const removed = await removeWebhook(user.id, id);
      if (!removed) {
        return res.status(404).json({ success: false, message: "Webhook introuvable" });
      }

      await prisma.auditLog.create({
        data: { userId: user.id, action: "WEBHOOK_DELETE", metadata: { webhookId: id } },
      });

      emitEvent("webhook.deleted", { userId: user.id, id });

      counterWebhooks.inc({ action: "delete", status: "success" });
      histogramWebhookLatency.observe(Date.now() - start);

      res.json({ success: true, message: "Webhook supprimé" });
    } catch (err: any) {
      counterWebhooks.inc({ action: "delete", status: "failed" });
      console.error("❌ removeWebhook error:", err);
      res.status(500).json({ success: false, message: "Erreur suppression webhook" });
    }
  }
);

/* ============================================================================
 *  ADMIN ROUTES – Rôle ADMIN requis
 * ========================================================================== */

/**
 * GET /api/webhooks/admin/all
 * ➝ Lister tous les webhooks enregistrés
 */
router.get(
  "/admin/all",
  authorize(["ADMIN"]),
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("pageSize").optional().isInt({ min: 1, max: 200 }).toInt(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const page = Number(req.query.page) || 1;
      const pageSize = Number(req.query.pageSize) || 50;

      const [total, hooks] = await Promise.all([
        prisma.webhook.count(),
        prisma.webhook.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: "desc" },
        }),
      ]);

      res.json({
        success: true,
        data: hooks,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      });
    } catch (err: any) {
      console.error("❌ listAllWebhooks error:", err);
      res.status(500).json({ success: false, message: "Erreur récupération webhooks (admin)" });
    }
  }
);

/* ============================================================================
 * HEALTHCHECK
 * ========================================================================== */
router.get("/health", (_req, res) =>
  res.json({
    ok: true,
    service: "webhooks",
    version: process.env.WEBHOOKS_VERSION || "1.0.0",
    ts: Date.now(),
  })
);

export default router;
