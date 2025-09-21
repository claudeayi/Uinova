// src/routes/jobs.ts
import { Router } from "express";
import { body, param } from "express-validator";
import { authenticate, authorize } from "../middlewares/security";
import { handleValidationErrors } from "../middlewares/validate";
import { JobService } from "../services/jobService";
import { prisma } from "../utils/prisma";
import { emitEvent } from "../services/eventBus";
import client from "prom-client";

const router = Router();
const jobs = new JobService();

/* ============================================================================
 * 📊 Prometheus metrics
 * ========================================================================== */
const counterJobs = new client.Counter({
  name: "uinova_jobs_total",
  help: "Nombre total de jobs créés",
  labelNames: ["type", "status"],
});

const histogramJobLatency = new client.Histogram({
  name: "uinova_job_latency_ms",
  help: "Latence de création des jobs",
  labelNames: ["type", "status"],
  buckets: [50, 100, 200, 500, 1000, 5000, 10000],
});

/* ============================================================================
 * JOBS ROUTES – nécessite authentification utilisateur
 * ========================================================================== */
router.use(authenticate);

/**
 * POST /api/jobs/export
 * ▶️ Enqueue un job d’export
 */
router.post(
  "/export",
  body("projectId").isString().isLength({ min: 5 }),
  body("target").isIn(["html", "react", "flutter", "pwa"]),
  body("exportId").optional().isString().isLength({ min: 5 }),
  handleValidationErrors,
  async (req, res) => {
    const start = Date.now();
    try {
      const { projectId, target, exportId } = req.body;

      const job = await jobs.enqueueExport({ projectId, target, exportId });

      await prisma.auditLog.create({
        data: {
          userId: req.user?.id,
          action: "JOB_EXPORT_CREATED",
          metadata: { projectId, target, exportId, jobId: job.id },
        },
      });

      emitEvent("job.export.created", { jobId: job.id, projectId, target });

      counterJobs.inc({ type: "export", status: "success" });
      histogramJobLatency.labels("export", "success").observe(Date.now() - start);

      res.status(201).json({
        success: true,
        message: "✅ Job d’export créé avec succès",
        jobId: job.id,
      });
    } catch (err: any) {
      counterJobs.inc({ type: "export", status: "failed" });
      histogramJobLatency.labels("export", "failed").observe(Date.now() - start);

      console.error("❌ Export job error:", err);
      res.status(500).json({
        success: false,
        error: "JOB_CREATION_FAILED",
        message: err.message || "Erreur création job export",
      });
    }
  }
);

/* ============================================================================
 * EXTENSIONS JOBS
 * ========================================================================== */

/**
 * POST /api/jobs/deploy
 * ▶️ Enqueue un job de déploiement
 */
router.post(
  "/deploy",
  body("projectId").isString().isLength({ min: 5 }),
  body("env").isIn(["staging", "production"]),
  handleValidationErrors,
  async (req, res) => {
    const start = Date.now();
    try {
      const { projectId, env } = req.body;
      const job = await jobs.enqueueDeploy({ projectId, env });

      await prisma.auditLog.create({
        data: {
          userId: req.user?.id,
          action: "JOB_DEPLOY_CREATED",
          metadata: { projectId, env, jobId: job.id },
        },
      });

      emitEvent("job.deploy.created", { jobId: job.id, projectId, env });

      counterJobs.inc({ type: "deploy", status: "success" });
      histogramJobLatency.labels("deploy", "success").observe(Date.now() - start);

      res.status(201).json({
        success: true,
        message: "✅ Job de déploiement créé avec succès",
        jobId: job.id,
      });
    } catch (err: any) {
      counterJobs.inc({ type: "deploy", status: "failed" });
      histogramJobLatency.labels("deploy", "failed").observe(Date.now() - start);

      console.error("❌ Deploy job error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * GET /api/jobs/:id
 * ▶️ Consulter le statut d’un job
 */
router.get(
  "/:id",
  param("id").isString().isLength({ min: 5 }),
  handleValidationErrors,
  async (req, res) => {
    try {
      const job = await jobs.getJobStatus(req.params.id);
      if (!job) return res.status(404).json({ success: false, error: "JOB_NOT_FOUND" });
      res.json({ success: true, job });
    } catch (err: any) {
      console.error("❌ Get job error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * DELETE /api/jobs/:id
 * ▶️ Annuler un job en attente
 */
router.delete(
  "/:id",
  param("id").isString().isLength({ min: 5 }),
  handleValidationErrors,
  async (req, res) => {
    try {
      const cancelled = await jobs.cancelJob(req.params.id, req.user!.id);
      if (!cancelled) return res.status(404).json({ success: false, error: "JOB_NOT_FOUND" });

      await prisma.auditLog.create({
        data: {
          userId: req.user?.id,
          action: "JOB_CANCELLED",
          metadata: { jobId: req.params.id },
        },
      });

      emitEvent("job.cancelled", { jobId: req.params.id, userId: req.user?.id });

      res.json({ success: true, message: `Job ${req.params.id} annulé` });
    } catch (err: any) {
      console.error("❌ Cancel job error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/* ============================================================================
 * HEALTH CHECK
 * ========================================================================== */
router.get("/health", (_req, res) =>
  res.json({
    ok: true,
    service: "jobs",
    version: process.env.JOBS_VERSION || "1.0.0",
    ts: Date.now(),
  })
);

export default router;
