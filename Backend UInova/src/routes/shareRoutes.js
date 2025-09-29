// src/routes/share.ts
import express from "express";
import { prisma } from "../utils/prisma.js";
import { nanoid } from "nanoid";
import { body, param, query } from "express-validator";
import { handleValidationErrors } from "../middlewares/validate";
import { auditLog } from "../services/auditLogService";
import { emitEvent } from "../services/eventBus";
import client from "prom-client";

const router = express.Router();

/* ============================================================================
 * 📊 Metrics Prometheus
 * ========================================================================== */
const counterShareLinks = new client.Counter({
  name: "uinova_share_links_total",
  help: "Nombre total d’actions sur les liens de partage",
  labelNames: ["action", "status"],
});

const histogramShareLifetime = new client.Histogram({
  name: "uinova_share_lifetime_minutes",
  help: "Durée de vie des liens de partage en minutes",
  buckets: [10, 60, 360, 1440, 10080, 43200], // 10min, 1h, 6h, 1j, 7j, 30j
});

/* ============================================================================
 *  SHARE LINKS – Création, accès et révocation
 * ========================================================================== */

/**
 * POST /api/share/:projectId
 * ▶️ Créer un lien de partage
 */
router.post(
  "/:projectId",
  param("projectId").isString().isLength({ min: 5 }).withMessage("projectId invalide"),
  body("isPublic").optional().isBoolean(),
  body("expiresIn")
    .optional()
    .isInt({ min: 1, max: 60 * 24 * 30 })
    .withMessage("expiresIn doit être entre 1 et 43200 minutes (30 jours)"),
  handleValidationErrors,
  async (req, res) => {
    const start = Date.now();
    try {
      const { projectId } = req.params;
      const { isPublic = true, expiresIn } = req.body;

      const token = nanoid(16);
      const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 60_000) : null;

      const link = await prisma.shareLink.create({
        data: { projectId, token, isPublic, expiresAt },
      });

      counterShareLinks.inc({ action: "create", status: "success" });
      if (expiresIn) histogramShareLifetime.observe(expiresIn);

      await auditLog.log(req.user?.id, "SHARE_CREATED", { projectId, isPublic, expiresIn });
      emitEvent("share.created", { userId: req.user?.id, projectId, token });

      res.status(201).json({
        success: true,
        message: "✅ Lien de partage créé avec succès",
        url: `${process.env.FRONTEND_URL}/preview/${projectId}?token=${token}`,
        link,
        latency: Date.now() - start,
      });
    } catch (err: any) {
      counterShareLinks.inc({ action: "create", status: "error" });
      console.error("❌ create share link error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * GET /api/share/:projectId
 * ▶️ Accéder à un projet via lien public
 */
router.get(
  "/:projectId",
  param("projectId").isString().isLength({ min: 5 }),
  query("token").isString().notEmpty(),
  handleValidationErrors,
  async (req, res) => {
    const start = Date.now();
    try {
      const { projectId } = req.params;
      const { token } = req.query;

      const link = await prisma.shareLink.findFirst({
        where: {
          projectId,
          token: String(token),
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      });

      if (!link) {
        counterShareLinks.inc({ action: "access", status: "forbidden" });
        return res.status(403).json({ success: false, error: "Lien invalide ou expiré" });
      }

      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          pages: { select: { id: true, name: true, schema: true } },
          owner: { select: { id: true, email: true } },
        },
      });

      counterShareLinks.inc({ action: "access", status: "success" });

      await auditLog.log(req.user?.id, "SHARE_ACCESSED", { projectId, token });
      emitEvent("share.accessed", { userId: req.user?.id, projectId, token });

      res.json({ success: true, project, latency: Date.now() - start });
    } catch (err: any) {
      counterShareLinks.inc({ action: "access", status: "error" });
      console.error("❌ get share link error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * DELETE /api/share/:projectId
 * ▶️ Révoquer tous les liens d’un projet
 */
router.delete(
  "/:projectId",
  param("projectId").isString().isLength({ min: 5 }),
  handleValidationErrors,
  async (req, res) => {
    const start = Date.now();
    try {
      const { projectId } = req.params;
      const deleted = await prisma.shareLink.deleteMany({ where: { projectId } });

      counterShareLinks.inc({ action: "revoke", status: "success" });

      await auditLog.log(req.user?.id, "SHARE_REVOKED", { projectId, count: deleted.count });
      emitEvent("share.revoked", { userId: req.user?.id, projectId, count: deleted.count });

      res.json({
        success: true,
        message: `✅ ${deleted.count} lien(s) supprimé(s) pour le projet ${projectId}`,
        latency: Date.now() - start,
      });
    } catch (err: any) {
      counterShareLinks.inc({ action: "revoke", status: "error" });
      console.error("❌ delete share links error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

export default router; // enrichi sans rien enlever
