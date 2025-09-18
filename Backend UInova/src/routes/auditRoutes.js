// src/routes/audit.ts
import express from "express";
import { prisma } from "../utils/prisma";
import { body, query, param } from "express-validator";
import { handleValidationErrors } from "../middlewares/validate";
import { authenticate, authorize } from "../middlewares/security";
import { auditLog } from "../services/auditLogService";
import { emitEvent } from "../services/eventBus";
import client from "prom-client";

const router = express.Router();

/* ============================================================================
 * 📊 Metrics Prometheus
 * ============================================================================
 */
const counterAudit = new client.Counter({
  name: "uinova_audit_requests_total",
  help: "Compteur des actions sur les logs d’audit",
  labelNames: ["action", "status"],
});

/* ============================================================================
 *  AUDIT LOG ROUTES
 * ============================================================================
 */

/**
 * POST /api/audit
 * ✅ Créer une entrée d’audit manuelle
 */
router.post(
  "/",
  authenticate,
  body("userId").optional().isString(),
  body("action").isString().notEmpty(),
  body("metadata").optional().isObject(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { userId, action, metadata } = req.body;
      const log = await prisma.auditLog.create({ data: { userId, action, metadata } });

      counterAudit.inc({ action: "create", status: "success" });
      await auditLog.log(req.user.id, "AUDIT_CREATED", { action, userId });
      emitEvent("audit.created", { log });

      res.status(201).json({ success: true, data: log });
    } catch (err: any) {
      counterAudit.inc({ action: "create", status: "error" });
      console.error("❌ createAudit error:", err);
      res.status(500).json({ error: "INTERNAL_ERROR", message: err.message });
    }
  }
);

/**
 * GET /api/audit
 * ✅ Lister les logs avec filtres + pagination
 */
router.get(
  "/",
  authenticate,
  authorize(["admin"]),
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

      counterAudit.inc({ action: "list", status: "success" });
      await auditLog.log(req.user.id, "AUDIT_LISTED", { total, page, pageSize });
      emitEvent("audit.listed", { total, page });

      res.json({
        success: true,
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize) || 1,
        data: logs,
      });
    } catch (err: any) {
      counterAudit.inc({ action: "list", status: "error" });
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

      counterAudit.inc({ action: "get", status: "success" });
      await auditLog.log(req.user.id, "AUDIT_FETCHED", { id });
      emitEvent("audit.fetched", { id });

      res.json({ success: true, data: log });
    } catch (err: any) {
      counterAudit.inc({ action: "get", status: "error" });
      console.error("❌ getAudit error:", err);
      res.status(500).json({ error: "INTERNAL_ERROR", message: err.message });
    }
  }
);

/**
 * DELETE /api/audit/purge
 * ✅ Purger les vieux logs (admin only)
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

      counterAudit.inc({ action: "purge", status: "success" });
      await auditLog.log(req.user.id, "AUDIT_PURGED", { before, count: result.count });
      emitEvent("audit.purged", { before, count: result.count });

      res.json({ success: true, purged: result.count });
    } catch (err: any) {
      counterAudit.inc({ action: "purge", status: "error" });
      console.error("❌ purgeAudit error:", err);
      res.status(500).json({ error: "INTERNAL_ERROR", message: err.message });
    }
  }
);

export default router;
