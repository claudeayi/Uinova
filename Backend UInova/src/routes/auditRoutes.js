// src/routes/audit.ts
import express from "express";
import { prisma } from "../utils/prisma";
import { body, query, param } from "express-validator";
import { handleValidationErrors } from "../middlewares/validate";
import { authenticate, authorize } from "../middlewares/security";

const router = express.Router();

/* ============================================================================
 *  AUDIT LOG ROUTES
 * ========================================================================== */

/**
 * POST /api/audit
 * ✅ Créer une entrée d’audit manuelle
 * Body: { userId, action, metadata? }
 */
router.post(
  "/",
  authenticate, // 🔒 nécessite user connecté
  body("userId").optional().isString().withMessage("userId doit être une chaîne"),
  body("action").isString().notEmpty().withMessage("action est obligatoire"),
  body("metadata").optional().isObject().withMessage("metadata doit être un objet"),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { userId, action, metadata } = req.body;

      const log = await prisma.auditLog.create({
        data: { userId, action, metadata },
      });

      res.status(201).json({ success: true, data: log });
    } catch (err: any) {
      console.error("❌ createAudit error:", err);
      res.status(500).json({ error: "INTERNAL_ERROR", message: err.message });
    }
  }
);

/**
 * GET /api/audit
 * ✅ Lister les logs avec filtres + pagination
 * Query:
 *  - userId?: string
 *  - action?: string
 *  - from?: ISODate
 *  - to?: ISODate
 *  - page=1
 *  - pageSize=50
 */
router.get(
  "/",
  authenticate,
  authorize(["admin"]), // 🔒 admin uniquement
  query("userId").optional().isString(),
  query("action").optional().isString(),
  query("from").optional().isISO8601().toDate(),
  query("to").optional().isISO8601().toDate(),
  query("page").optional().toInt().isInt({ min: 1 }).default(1),
  query("pageSize").optional().toInt().isInt({ min: 1, max: 200 }).default(50),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { userId, action, from, to, page = 1, pageSize = 50 } = req.query as any;

      const where: any = {};
      if (userId) where.userId = userId;
      if (action) where.action = action;
      if (from || to) {
        where.createdAt = {};
        if (from) where.createdAt.gte = new Date(from);
        if (to) where.createdAt.lte = new Date(to);
      }

      const [total, logs] = await Promise.all([
        prisma.auditLog.count({ where }),
        prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ]);

      res.json({
        success: true,
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize) || 1,
        data: logs,
      });
    } catch (err: any) {
      console.error("❌ listAudit error:", err);
      res.status(500).json({ error: "INTERNAL_ERROR", message: err.message });
    }
  }
);

/**
 * GET /api/audit/:id
 * ✅ Récupérer un log précis
 */
router.get(
  "/:id",
  authenticate,
  authorize(["admin"]),
  param("id").isString().notEmpty(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const log = await prisma.auditLog.findUnique({ where: { id } });
      if (!log) return res.status(404).json({ error: "NOT_FOUND" });
      res.json({ success: true, data: log });
    } catch (err: any) {
      console.error("❌ getAudit error:", err);
      res.status(500).json({ error: "INTERNAL_ERROR", message: err.message });
    }
  }
);

/**
 * DELETE /api/audit/purge
 * ✅ Purger les vieux logs (admin only)
 * Body: { before: ISODate }
 */
router.delete(
  "/purge",
  authenticate,
  authorize(["admin"]),
  body("before").isISO8601().withMessage("Date before invalide"),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { before } = req.body;
      const result = await prisma.auditLog.deleteMany({
        where: { createdAt: { lte: new Date(before) } },
      });
      res.json({ success: true, purged: result.count });
    } catch (err: any) {
      console.error("❌ purgeAudit error:", err);
      res.status(500).json({ error: "INTERNAL_ERROR", message: err.message });
    }
  }
);

export default router;
