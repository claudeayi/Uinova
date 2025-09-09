// src/routes/share.ts
import express from "express";
import { prisma } from "../utils/prisma.js";
import { nanoid } from "nanoid";
import { body, param, query } from "express-validator";
import { handleValidationErrors } from "../middlewares/validate";

const router = express.Router();

/* ============================================================================
 *  SHARE LINKS – Lien public/privé pour accéder à un projet
 * ========================================================================== */

/**
 * POST /api/share/:projectId
 * ▶️ Créer un lien de partage
 * Body: { isPublic?: boolean, expiresIn?: number (minutes) }
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
    try {
      const { projectId } = req.params;
      const { isPublic = true, expiresIn } = req.body;

      const token = nanoid(16);

      const link = await prisma.shareLink.create({
        data: {
          projectId,
          token,
          isPublic,
          expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 60_000) : null,
        },
      });

      res.json({
        success: true,
        message: "Lien de partage créé avec succès",
        url: `${process.env.FRONTEND_URL}/preview/${projectId}?token=${token}`,
        link,
      });
    } catch (err: any) {
      console.error("❌ create share link error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * GET /api/share/:projectId
 * ▶️ Accéder à un projet via lien public
 * Query: ?token=xxx
 */
router.get(
  "/:projectId",
  param("projectId").isString().isLength({ min: 5 }),
  query("token").isString().notEmpty(),
  handleValidationErrors,
  async (req, res) => {
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
        return res
          .status(403)
          .json({ success: false, error: "Lien invalide ou expiré" });
      }

      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          pages: { select: { id: true, name: true, schema: true } },
          owner: { select: { id: true, email: true } },
        },
      });

      res.json({ success: true, project });
    } catch (err: any) {
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
    try {
      const { projectId } = req.params;
      const deleted = await prisma.shareLink.deleteMany({ where: { projectId } });

      res.json({
        success: true,
        message: `✅ ${deleted.count} lien(s) supprimé(s) pour le projet ${projectId}`,
      });
    } catch (err: any) {
      console.error("❌ delete share links error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

export default router;
