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
      return res.status(401).json({ error: "UNAUTHORIZED", message: "Non autorisé" });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ error: "NOT_FOUND", message: "Projet introuvable" });
    if (project.ownerId !== user.id && user.role !== "ADMIN") {
      return res.status(403).json({ error: "FORBIDDEN", message: "Accès interdit à ce projet" });
    }

    const deployment = await prisma.deployment.create({
      data: {
        projectId,
        status: "PENDING",
        logs: "🚀 Déploiement lancé...\n",
        targetUrl: `https://cloud.uinova.io/${projectId}/${Date.now()}`,
      },
    });

    // Audit + EventBus
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "DEPLOY_START",
        metadata: { projectId, deployId: deployment.id },
      },
    });
    emitEvent("deployment.started", { projectId, deployId: deployment.id });

    // ⚡ Simulation async (mock infra pipeline)
    setTimeout(async () => {
      await prisma.deployment.update({
        where: { id: deployment.id },
        data: {
          status: "RUNNING",
          logs: (deployment.logs || "") + "\n⚙️ Build en cours...",
        },
      });
      emitEvent("deployment.running", { projectId, deployId: deployment.id });
    }, 2000);

    setTimeout(async () => {
      await prisma.deployment.update({
        where: { id: deployment.id },
        data: {
          status: "SUCCESS",
          logs: (deployment.logs || "") + "\n✅ Déploiement terminé avec succès.",
        },
      });
      emitEvent("deployment.success", { projectId, deployId: deployment.id });
    }, 6000);

    res.status(201).json(deployment);
  } catch (err) {
    console.error("❌ startDeployment error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "Erreur serveur" });
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
      return res.status(404).json({ error: "NOT_FOUND", message: "Aucun déploiement trouvé" });
    }
    res.json({ success: true, data: deployment });
  } catch (err) {
    console.error("❌ getDeploymentStatus error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "Erreur serveur" });
  }
}

// ✅ GET /deploy/:projectId/history → historique complet
export async function getDeploymentHistory(req: Request, res: Response) {
  try {
    const { projectId } = req.params;
    const deployments = await prisma.deployment.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: deployments });
  } catch (err) {
    console.error("❌ getDeploymentHistory error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "Erreur serveur" });
  }
}

// ✅ POST /deploy/:projectId/:deployId/rollback → rollback
export async function rollbackDeployment(req: Request, res: Response) {
  try {
    const { projectId, deployId } = req.params;
    const user = (req as any).user;
    if (!user?.id) return res.status(401).json({ error: "UNAUTHORIZED" });

    const deployment = await prisma.deployment.findUnique({ where: { id: deployId } });
    if (!deployment || deployment.projectId !== projectId) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Déploiement introuvable" });
    }

    const rollback = await prisma.deployment.create({
      data: {
        projectId,
        status: "SUCCESS",
        logs: "↩️ Rollback vers version précédente effectué avec succès.",
        targetUrl: deployment.targetUrl,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "DEPLOY_ROLLBACK",
        metadata: { projectId, rollbackId: rollback.id, from: deployId },
      },
    });
    emitEvent("deployment.rollback", { projectId, rollbackId: rollback.id, from: deployId });

    res.json({ success: true, data: rollback });
  } catch (err) {
    console.error("❌ rollbackDeployment error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "Erreur serveur" });
  }
}

// ✅ GET /deploy/:projectId/:deployId/logs → logs déploiement
export async function getDeploymentLogs(req: Request, res: Response) {
  try {
    const { deployId } = req.params;

    const deployment = await prisma.deployment.findUnique({ where: { id: deployId } });
    if (!deployment) return res.status(404).json({ error: "NOT_FOUND" });

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.send(deployment.logs || "Aucun log disponible.");
  } catch (err) {
    console.error("❌ getDeploymentLogs error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "Erreur serveur" });
  }
}

/* ============================================================================
 *  ADMIN ENDPOINTS – pour ProjectsAdmin / Monitoring
 * ========================================================================== */

// ✅ GET /admin/deployments → tous les déploiements (admin only)
export async function listAllDeployments(req: Request, res: Response) {
  try {
    const role = (req as any).user?.role;
    if (role !== "ADMIN") {
      return res.status(403).json({ error: "FORBIDDEN", message: "Accès admin requis" });
    }

    const deployments = await prisma.deployment.findMany({
      include: {
        project: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    res.json({ success: true, data: deployments });
  } catch (err) {
    console.error("❌ listAllDeployments error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "Erreur serveur" });
  }
}
