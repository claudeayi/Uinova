import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { emitEvent } from "../services/eventBus";
import { logger } from "../utils/logger";
import client from "prom-client";
import { z } from "zod";

/* ============================================================================
 *  METRICS Prometheus
 * ========================================================================== */
const counterDeploySuccess = new client.Counter({
  name: "uinova_deploy_success_total",
  help: "Nombre total de déploiements réussis",
});
const counterDeployFail = new client.Counter({
  name: "uinova_deploy_fail_total",
  help: "Nombre total de déploiements échoués",
});
const counterDeployAbort = new client.Counter({
  name: "uinova_deploy_abort_total",
  help: "Nombre total de déploiements annulés",
});
const counterDeployRollback = new client.Counter({
  name: "uinova_deploy_rollback_total",
  help: "Nombre total de rollbacks effectués",
});
const histogramDeployLatency = new client.Histogram({
  name: "uinova_deploy_latency_seconds",
  help: "Durée totale des déploiements",
  buckets: [1, 5, 10, 30, 60, 120, 300],
});

/* ============================================================================
 *  VALIDATION Schemas
 * ========================================================================== */
const PaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

const IdSchema = z.object({
  projectId: z.string().min(1),
  deployId: z.string().min(1).optional(),
});

/* ============================================================================
 *  DEPLOY CONTROLLER
 * ========================================================================== */

// ✅ POST /deploy/:projectId → lancer un déploiement
export async function startDeployment(req: Request, res: Response) {
  const start = Date.now();
  try {
    const { projectId } = IdSchema.parse(req.params);
    const user = (req as any).user;
    if (!user?.id) return res.status(401).json({ success: false, error: "UNAUTHORIZED" });

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ success: false, error: "NOT_FOUND" });
    if (project.ownerId !== user.id && user.role !== "ADMIN") {
      return res.status(403).json({ success: false, error: "FORBIDDEN" });
    }

    const deployment = await prisma.deployment.create({
      data: {
        projectId,
        status: "PENDING",
        logs: `[${new Date().toISOString()}] 🚀 Déploiement lancé...\n`,
        targetUrl: `https://cloud.uinova.io/${projectId}/${Date.now()}`,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "DEPLOY_START",
        metadata: { projectId, deployId: deployment.id, ip: req.ip, ua: req.headers["user-agent"] },
      },
    });
    emitEvent("deployment.started", { projectId, deployId: deployment.id, userId: user.id });

    // ⚡ Simulation pipeline
    setTimeout(async () => {
      const current = await prisma.deployment.findUnique({ where: { id: deployment.id } });
      if (current?.status === "ABORTED") return;
      await prisma.deployment.update({
        where: { id: deployment.id },
        data: { status: "RUNNING", logs: (deployment.logs || "") + `[${new Date().toISOString()}] ⚙️ Build en cours...\n` },
      });
      emitEvent("deployment.running", { projectId, deployId: deployment.id });
    }, 2000);

    setTimeout(async () => {
      const current = await prisma.deployment.findUnique({ where: { id: deployment.id } });
      if (!current || current.status === "ABORTED") return;

      await prisma.deployment.update({
        where: { id: deployment.id },
        data: {
          status: "SUCCESS",
          logs: (current.logs || "") + `[${new Date().toISOString()}] ✅ Déploiement terminé avec succès.\n`,
        },
      });
      emitEvent("deployment.success", { projectId, deployId: deployment.id });
      counterDeploySuccess.inc();
      histogramDeployLatency.observe((Date.now() - start) / 1000);
    }, 6000);

    res.status(201).json({ success: true, data: deployment });
  } catch (err: any) {
    counterDeployFail.inc();
    logger.error("❌ startDeployment error", err);
    res.status(500).json({ success: false, error: "SERVER_ERROR", message: err.message });
  }
}

// ✅ POST /deploy/:projectId/:deployId/abort
export async function abortDeployment(req: Request, res: Response) {
  try {
    const { projectId, deployId } = IdSchema.parse(req.params);
    const user = (req as any).user;
    if (!user?.id) return res.status(401).json({ success: false, error: "UNAUTHORIZED" });

    const deployment = await prisma.deployment.findUnique({ where: { id: deployId } });
    if (!deployment || deployment.projectId !== projectId) {
      return res.status(404).json({ success: false, error: "NOT_FOUND" });
    }
    if (["SUCCESS", "FAILED"].includes(deployment.status)) {
      return res.status(400).json({ success: false, error: "INVALID_STATE" });
    }

    await prisma.deployment.update({
      where: { id: deployId },
      data: {
        status: "ABORTED",
        logs: (deployment.logs || "") + `[${new Date().toISOString()}] ❌ Déploiement annulé par ${user.email || user.id}.\n`,
      },
    });

    await prisma.auditLog.create({
      data: { userId: user.id, action: "DEPLOY_ABORT", metadata: { projectId, deployId } },
    });
    emitEvent("deployment.aborted", { projectId, deployId, userId: user.id });
    counterDeployAbort.inc();

    res.json({ success: true, message: "Déploiement annulé avec succès" });
  } catch (err: any) {
    logger.error("❌ abortDeployment error", err);
    res.status(500).json({ success: false, error: "SERVER_ERROR", message: err.message });
  }
}

// ✅ GET /deploy/:projectId/status
export async function getDeploymentStatus(req: Request, res: Response) {
  try {
    const { projectId } = IdSchema.parse(req.params);
    const deployment = await prisma.deployment.findFirst({ where: { projectId }, orderBy: { createdAt: "desc" } });
    if (!deployment) return res.status(404).json({ success: false, error: "NOT_FOUND" });

    await prisma.auditLog.create({
      data: { userId: (req as any).user?.id, action: "DEPLOY_STATUS_VIEW", metadata: { projectId, deployId: deployment.id } },
    });

    res.json({ success: true, data: deployment });
  } catch (err: any) {
    logger.error("❌ getDeploymentStatus error", err);
    res.status(500).json({ success: false, error: "SERVER_ERROR", message: err.message });
  }
}

// ✅ GET /deploy/:projectId/history
export async function getDeploymentHistory(req: Request, res: Response) {
  try {
    const { projectId } = IdSchema.parse(req.params);
    const { page, limit } = PaginationSchema.parse(req.query);
    const skip = (page - 1) * limit;

    const [deployments, total] = await Promise.all([
      prisma.deployment.findMany({ where: { projectId }, orderBy: { createdAt: "desc" }, skip, take: limit }),
      prisma.deployment.count({ where: { projectId } }),
    ]);

    await prisma.auditLog.create({
      data: { userId: (req as any).user?.id, action: "DEPLOY_HISTORY_VIEW", metadata: { projectId } },
    });

    res.json({ success: true, data: deployments, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err: any) {
    logger.error("❌ getDeploymentHistory error", err);
    res.status(500).json({ success: false, error: "SERVER_ERROR", message: err.message });
  }
}

// ✅ POST /deploy/:projectId/:deployId/rollback
export async function rollbackDeployment(req: Request, res: Response) {
  try {
    const { projectId, deployId } = IdSchema.parse(req.params);
    const user = (req as any).user;
    if (!user?.id) return res.status(401).json({ success: false, error: "UNAUTHORIZED" });

    const deployment = await prisma.deployment.findUnique({ where: { id: deployId } });
    if (!deployment || deployment.projectId !== projectId) {
      return res.status(404).json({ success: false, error: "NOT_FOUND" });
    }
    if (user.role !== "ADMIN" && projectId !== user.id) {
      return res.status(403).json({ success: false, error: "FORBIDDEN" });
    }

    const rollback = await prisma.deployment.create({
      data: {
        projectId,
        status: "SUCCESS",
        logs: `[${new Date().toISOString()}] ↩️ Rollback vers version précédente depuis ${deployId}.\n`,
        targetUrl: deployment.targetUrl,
      },
    });

    await prisma.auditLog.create({
      data: { userId: user.id, action: "DEPLOY_ROLLBACK", metadata: { projectId, rollbackId: rollback.id, from: deployId } },
    });
    emitEvent("deployment.rollback", { projectId, rollbackId: rollback.id, from: deployId });
    counterDeployRollback.inc();

    res.json({ success: true, data: rollback });
  } catch (err: any) {
    logger.error("❌ rollbackDeployment error", err);
    res.status(500).json({ success: false, error: "SERVER_ERROR", message: err.message });
  }
}

// ✅ GET /deploy/:projectId/:deployId/logs
export async function getDeploymentLogs(req: Request, res: Response) {
  try {
    const { deployId } = IdSchema.parse(req.params);
    const user = (req as any).user;
    if (!user?.id) return res.status(401).json({ success: false, error: "UNAUTHORIZED" });

    const deployment = await prisma.deployment.findUnique({ where: { id: deployId } });
    if (!deployment) return res.status(404).json({ success: false, error: "NOT_FOUND" });

    await prisma.auditLog.create({
      data: { userId: user.id, action: "DEPLOY_LOGS_VIEW", metadata: { deployId } },
    });

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.send(deployment.logs || "Aucun log disponible.");
  } catch (err: any) {
    logger.error("❌ getDeploymentLogs error", err);
    res.status(500).json({ success: false, error: "SERVER_ERROR", message: err.message });
  }
}

// ✅ GET /admin/deployments
export async function listAllDeployments(req: Request, res: Response) {
  try {
    const role = (req as any).user?.role;
    if (role !== "ADMIN") return res.status(403).json({ success: false, error: "FORBIDDEN" });

    const { page, limit } = PaginationSchema.parse(req.query);
    const skip = (page - 1) * limit;

    const [deployments, total] = await Promise.all([
      prisma.deployment.findMany({
        include: { project: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.deployment.count(),
    ]);

    res.json({ success: true, data: deployments, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err: any) {
    logger.error("❌ listAllDeployments error", err);
    res.status(500).json({ success: false, error: "SERVER_ERROR", message: err.message });
  }
}
