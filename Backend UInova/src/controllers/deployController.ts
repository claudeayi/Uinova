// src/controllers/deployController.ts
import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { emitEvent } from "../services/eventBus";

/* ============================================================================
 *  DEPLOY CONTROLLER – gestion des déploiements cloud (mock infra-as-code)
 * ========================================================================== */

// ✅ POST /deploy/:projectId → lancer un déploiement
export async function startDeployment(req: Request, res: Response) {
  try {
    const { projectId } = req.params;
    const user = (req as any).user;
    if (!user?.id) {
      return res.status(401).json({ success: false, error: "UNAUTHORIZED", message: "Non autorisé" });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ success: false, error: "NOT_FOUND", message: "Projet introuvable" });
    if (project.ownerId !== user.id && user.role !== "ADMIN") {
      return res.status(403).json({ success: false, error: "FORBIDDEN", message: "Accès interdit à ce projet" });
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
      data: { userId: user.id, action: "DEPLOY_START", metadata: { projectId, deployId: deployment.id } },
    });
    emitEvent("deployment.started", { projectId, deployId: deployment.id, userId: user.id });

    // ⚡ Simulation pipeline
    setTimeout(async () => {
      const current = await prisma.deployment.findUnique({ where: { id: deployment.id } });
      if (current?.status === "ABORTED") return;

      await prisma.deployment.update({
        where: { id: deployment.id },
        data: {
          status: "RUNNING",
          logs: (deployment.logs || "") + `[${new Date().toISOString()}] ⚙️ Build en cours...\n`,
        },
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
    }, 6000);

    res.status(201).json({ success: true, data: deployment });
  } catch (err) {
    console.error("❌ startDeployment error:", err);
    res.status(500).json({ success: false, error: "SERVER_ERROR", message: "Erreur serveur" });
  }
}

// ✅ POST /deploy/:projectId/:deployId/abort → annuler un déploiement
export async function abortDeployment(req: Request, res: Response) {
  try {
    const { projectId, deployId } = req.params;
    const user = (req as any).user;
    if (!user?.id) return res.status(401).json({ success: false, error: "UNAUTHORIZED" });

    const deployment = await prisma.deployment.findUnique({ where: { id: deployId } });
    if (!deployment || deployment.projectId !== projectId) {
      return res.status(404).json({ success: false, error: "NOT_FOUND", message: "Déploiement introuvable" });
    }

    if (deployment.status === "SUCCESS" || deployment.status === "FAILED") {
      return res.status(400).json({ success: false, error: "INVALID_STATE", message: "Impossible d’annuler un déploiement terminé" });
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

    res.json({ success: true, message: "Déploiement annulé avec succès" });
  } catch (err) {
    console.error("❌ abortDeployment error:", err);
    res.status(500).json({ success: false, error: "SERVER_ERROR", message: "Erreur serveur" });
  }
}

// ✅ GET /deploy/:projectId/status → dernier déploiement
export async function getDeploymentStatus(req: Request, res: Response) {
  try {
    const { projectId } = req.params;
    const deployment = await prisma.deployment.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });
    if (!deployment) {
      return res.status(404).json({ success: false, error: "NOT_FOUND", message: "Aucun déploiement trouvé" });
    }

    await prisma.auditLog.create({
      data: { userId: (req as any).user?.id, action: "DEPLOY_STATUS_VIEW", metadata: { projectId, deployId: deployment.id } },
    });

    res.json({ success: true, data: deployment });
  } catch (err) {
    console.error("❌ getDeploymentStatus error:", err);
    res.status(500).json({ success: false, error: "SERVER_ERROR", message: "Erreur serveur" });
  }
}

// ✅ GET /deploy/:projectId/history → historique complet (pagination)
export async function getDeploymentHistory(req: Request, res: Response) {
  try {
    const { projectId } = req.params;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [deployments, total] = await Promise.all([
      prisma.deployment.findMany({ where: { projectId }, orderBy: { createdAt: "desc" }, skip, take: limit }),
      prisma.deployment.count({ where: { projectId } }),
    ]);

    await prisma.auditLog.create({
      data: { userId: (req as any).user?.id, action: "DEPLOY_HISTORY_VIEW", metadata: { projectId } },
    });

    res.json({
      success: true,
      data: deployments,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("❌ getDeploymentHistory error:", err);
    res.status(500).json({ success: false, error: "SERVER_ERROR", message: "Erreur serveur" });
  }
}

// ✅ POST /deploy/:projectId/:deployId/rollback → rollback
export async function rollbackDeployment(req: Request, res: Response) {
  try {
    const { projectId, deployId } = req.params;
    const user = (req as any).user;
    if (!user?.id) return res.status(401).json({ success: false, error: "UNAUTHORIZED" });

    const deployment = await prisma.deployment.findUnique({ where: { id: deployId } });
    if (!deployment || deployment.projectId !== projectId) {
      return res.status(404).json({ success: false, error: "NOT_FOUND", message: "Déploiement introuvable" });
    }

    if (user.role !== "ADMIN" && projectId !== user.id) {
      return res.status(403).json({ success: false, error: "FORBIDDEN", message: "Accès interdit" });
    }

    const rollback = await prisma.deployment.create({
      data: {
        projectId,
        status: "SUCCESS",
        logs: `[${new Date().toISOString()}] ↩️ Rollback vers version précédente depuis ${deployId} effectué.\n`,
        targetUrl: deployment.targetUrl,
      },
    });

    await prisma.auditLog.create({
      data: { userId: user.id, action: "DEPLOY_ROLLBACK", metadata: { projectId, rollbackId: rollback.id, from: deployId } },
    });
    emitEvent("deployment.rollback", { projectId, rollbackId: rollback.id, from: deployId });

    res.json({ success: true, data: rollback });
  } catch (err) {
    console.error("❌ rollbackDeployment error:", err);
    res.status(500).json({ success: false, error: "SERVER_ERROR", message: "Erreur serveur" });
  }
}

// ✅ GET /deploy/:projectId/:deployId/logs → logs déploiement
export async function getDeploymentLogs(req: Request, res: Response) {
  try {
    const { deployId } = req.params;
    const user = (req as any).user;

    const deployment = await prisma.deployment.findUnique({ where: { id: deployId } });
    if (!deployment) return res.status(404).json({ success: false, error: "NOT_FOUND" });
    if (!user?.id) return res.status(401).json({ success: false, error: "UNAUTHORIZED" });

    await prisma.auditLog.create({
      data: { userId: user.id, action: "DEPLOY_LOGS_VIEW", metadata: { deployId } },
    });

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.send(deployment.logs || "Aucun log disponible.");
  } catch (err) {
    console.error("❌ getDeploymentLogs error:", err);
    res.status(500).json({ success: false, error: "SERVER_ERROR", message: "Erreur serveur" });
  }
}

/* ============================================================================
 *  ADMIN ENDPOINTS – pour ProjectsAdmin / Monitoring
 * ========================================================================== */

// ✅ GET /admin/deployments → tous les déploiements (admin only, pagination)
export async function listAllDeployments(req: Request, res: Response) {
  try {
    const role = (req as any).user?.role;
    if (role !== "ADMIN") {
      return res.status(403).json({ success: false, error: "FORBIDDEN", message: "Accès admin requis" });
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
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

    res.json({
      success: true,
      data: deployments,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("❌ listAllDeployments error:", err);
    res.status(500).json({ success: false, error: "SERVER_ERROR", message: "Erreur serveur" });
  }
}
