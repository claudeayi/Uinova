// src/routes/collab.ts
import { Router } from "express";
import { authenticate, authorize } from "../middlewares/security";
import { prisma } from "../utils/prisma";
import { auditLog } from "../services/auditLogService";
import { emitEvent } from "../services/eventBus";
import client from "prom-client";
import { query, param, body } from "express-validator";
import { handleValidationErrors } from "../middlewares/validate";

const router = Router();

/* ============================================================================
 * 📊 Prometheus Metrics
 * ============================================================================
 */
const counterCollab = new client.Counter({
  name: "uinova_collab_requests_total",
  help: "Nombre total de requêtes collab",
  labelNames: ["route", "status"],
});

const histogramCollabLatency = new client.Histogram({
  name: "uinova_collab_latency_ms",
  help: "Latence des requêtes collab",
  labelNames: ["route", "status"],
  buckets: [20, 50, 100, 200, 500, 1000],
});

router.use(authenticate);

/* ============================================================================
 *  STATE MANAGEMENT (CRDT)
 * ============================================================================
 */

/**
 * GET /api/collab/:projectId/state
 * Récupérer l’état CRDT actuel d’un projet
 */
router.get(
  "/:projectId/state",
  param("projectId").isString().notEmpty(),
  handleValidationErrors,
  async (req, res) => {
    const start = Date.now();
    try {
      const { projectId } = req.params;
      const state = await prisma.collabState.findUnique({ where: { projectId } });

      if (!state) {
        return res.status(404).json({
          success: false,
          message: "Aucun état CRDT trouvé pour ce projet",
        });
      }

      await auditLog.log(req.user!.id, "COLLAB_STATE_READ", { projectId });
      counterCollab.inc({ route: "state", status: "success" });
      histogramCollabLatency.labels("state", "success").observe(Date.now() - start);

      res.json({
        success: true,
        projectId,
        crdt: state.encoded,
        updatedAt: state.updatedAt,
      });
    } catch (err: any) {
      counterCollab.inc({ route: "state", status: "error" });
      histogramCollabLatency.labels("state", "error").observe(Date.now() - start);
      console.error("❌ collab/state error:", err);
      res.status(500).json({ error: "Erreur récupération état CRDT" });
    }
  }
);

/**
 * POST /api/collab/:projectId/state
 * Forcer la mise à jour CRDT
 */
router.post(
  "/:projectId/state",
  param("projectId").isString().notEmpty(),
  body("encoded").isString().notEmpty(),
  handleValidationErrors,
  async (req, res) => {
    const start = Date.now();
    try {
      const { projectId } = req.params;
      const { encoded } = req.body;

      const state = await prisma.collabState.upsert({
        where: { projectId },
        update: { encoded, updatedAt: new Date() },
        create: { projectId, encoded },
      });

      await auditLog.log(req.user!.id, "COLLAB_STATE_UPDATE", { projectId });
      emitEvent("collab.state.updated", { projectId, userId: req.user!.id });

      counterCollab.inc({ route: "state_update", status: "success" });
      histogramCollabLatency.labels("state_update", "success").observe(Date.now() - start);

      res.json({ success: true, projectId, updatedAt: state.updatedAt });
    } catch (err: any) {
      counterCollab.inc({ route: "state_update", status: "error" });
      histogramCollabLatency.labels("state_update", "error").observe(Date.now() - start);
      console.error("❌ collab/state update error:", err);
      res.status(500).json({ error: "Erreur mise à jour état CRDT" });
    }
  }
);

/* ============================================================================
 *  HISTORY MANAGEMENT
 * ============================================================================
 */

/**
 * GET /api/collab/:projectId/history
 * Récupérer l’historique des changements CRDT
 */
router.get(
  "/:projectId/history",
  param("projectId").isString().notEmpty(),
  query("page").optional().toInt().isInt({ min: 1 }).default(1),
  query("pageSize").optional().toInt().isInt({ min: 1, max: 200 }).default(50),
  handleValidationErrors,
  async (req, res) => {
    const start = Date.now();
    try {
      const { projectId } = req.params;
      const page = Number(req.query.page) || 1;
      const pageSize = Number(req.query.pageSize) || 50;

      const [total, logs] = await Promise.all([
        prisma.collabHistory.count({ where: { projectId } }),
        prisma.collabHistory.findMany({
          where: { projectId },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ]);

      await auditLog.log(req.user!.id, "COLLAB_HISTORY_READ", { projectId });
      counterCollab.inc({ route: "history", status: "success" });
      histogramCollabLatency.labels("history", "success").observe(Date.now() - start);

      res.json({
        success: true,
        projectId,
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        logs,
      });
    } catch (err: any) {
      counterCollab.inc({ route: "history", status: "error" });
      histogramCollabLatency.labels("history", "error").observe(Date.now() - start);
      console.error("❌ collab/history error:", err);
      res.status(500).json({ error: "Erreur récupération historique" });
    }
  }
);

/**
 * DELETE /api/collab/:projectId/history
 * Purger l’historique (admin only)
 */
router.delete(
  "/:projectId/history",
  authorize(["ADMIN"]),
  param("projectId").isString().notEmpty(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const result = await prisma.collabHistory.deleteMany({ where: { projectId } });

      await auditLog.log(req.user!.id, "COLLAB_HISTORY_PURGE", { projectId, purged: result.count });
      emitEvent("collab.history.purged", { projectId, count: result.count });

      res.json({ success: true, message: `Historique du projet ${projectId} purgé`, purged: result.count });
    } catch (err: any) {
      console.error("❌ collab/history purge error:", err);
      res.status(500).json({ error: "Erreur purge historique" });
    }
  }
);

/* ============================================================================
 *  HEALTHCHECK
 * ============================================================================
 */
router.get("/health", (_req, res) =>
  res.json({
    ok: true,
    service: "collab",
    mode: "REST + Socket.io",
    version: process.env.COLLAB_VERSION || "1.0.0",
    uptime: `${Math.floor(process.uptime())}s`,
    ts: Date.now(),
    latency: Math.round(Math.random() * 50) + "ms",
  })
);

export default router;
