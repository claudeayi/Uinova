// src/routes/webhooks.ts
import { Router } from "express";
import { authenticate } from "../middlewares/security";
import { registerWebhook, listWebhooks, removeWebhook } from "../services/eventBus";
import { body, param, query } from "express-validator";
import { handleValidationErrors } from "../middlewares/validate";
import { prisma } from "../utils/prisma";

const router = Router();

/* ============================================================================
 * WEBHOOK ROUTES – Auth Required
 * ============================================================================
 */
router.use(authenticate);

/**
 * POST /api/webhooks/register
 * ➝ Enregistrer un webhook externe (event + url)
 */
router.post(
  "/register",
  body("url").isURL().withMessage("URL de webhook invalide"),
  body("event")
    .isString()
    .isLength({ min: 3, max: 50 })
    .withMessage("Événement requis"),
  body("secret")
    .optional()
    .isString()
    .isLength({ min: 10, max: 100 })
    .withMessage("Secret invalide"),
  handleValidationErrors,
  async (req, res) => {
    try {
      const user = (req as any).user;
      const { url, event, secret } = req.body;

      const webhook = await registerWebhook(user.id, url, event, secret);

      // Audit log
      await prisma.auditLog.create({
        data: { userId: user.id, action: "WEBHOOK_REGISTER", metadata: { url, event } },
      });

      res.status(201).json({ success: true, message: "Webhook enregistré", data: webhook });
    } catch (err: any) {
      console.error("❌ registerWebhook error:", err);
      res.status(500).json({ success: false, message: "Erreur enregistrement webhook" });
    }
  }
);

/**
 * GET /api/webhooks
 * ➝ Lister mes webhooks (paginé)
 * Query: ?page=1&pageSize=20&event=payment.succeeded
 */
router.get(
  "/",
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("pageSize").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("event").optional().isString(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const user = (req as any).user;
      const page = Number(req.query.page) || 1;
      const pageSize = Number(req.query.pageSize) || 20;
      const event = req.query.event as string | undefined;

      const [total, hooks] = await Promise.all([
        prisma.webhook.count({
          where: { userId: user.id, ...(event ? { event } : {}) },
        }),
        listWebhooks(user.id, { page, pageSize, event }),
      ]);

      res.json({
        success: true,
        data: hooks,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      });
    } catch (err: any) {
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
    try {
      const user = (req as any).user;
      const { id } = req.params;

      const removed = await removeWebhook(user.id, id);
      if (!removed) {
        return res.status(404).json({ success: false, message: "Webhook introuvable" });
      }

      // Audit log
      await prisma.auditLog.create({
        data: { userId: user.id, action: "WEBHOOK_DELETE", metadata: { webhookId: id } },
      });

      res.json({ success: true, message: "Webhook supprimé" });
    } catch (err: any) {
      console.error("❌ removeWebhook error:", err);
      res.status(500).json({ success: false, message: "Erreur suppression webhook" });
    }
  }
);

export default router;
