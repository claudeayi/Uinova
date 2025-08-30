import { Request, Response } from "express";
import { prisma } from "../utils/prisma";

/* ============================================================================
 *  DEPLOY CONTROLLER – gestion des déploiements cloud (mock infra-as-code)
 * ========================================================================== */

// ✅ POST /deploy/:projectId → lancer un déploiement
export async function startDeployment(req: Request, res: Response) {
  try {
    const { projectId } = req.params;
    const user = (req as any).user;
    if (!user?.id) return res.status(401).json({ error: "UNAUTHORIZED", message: "Non autorisé" });

    // Vérifier projet
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ error: "NOT_FOUND", message: "Projet introuvable" });
    if (project.ownerId !== user.id && user.role !== "ADMIN") {
      return res.status(403).json({ error: "FORBIDDEN", message: "Accès interdit à ce projet" });
    }

    // Créer enregistrement
    const deployment = await prisma.deployment.create({
      data: {
        projectId,
        status: "PENDING",
        logs: "🚀 Déploiement lancé...\n",
        targetUrl: `https://cloud.uinova.io/${projectId}/${Date.now()}`,
      },
    });

    // ⚡ Simulation async (à remplacer par CI/CD ou IaC)
    setTimeout(async () => {
      await prisma.deployment.update({
        where: { id: deployment.id },
        data: {
          status: "RUNNING",
          logs: deployment.logs + "\n⚙️ Build en cours...",
        },
      });
    }, 2000);

    setTimeout(async () => {
      await prisma.deployment.update({
        where: { id: deployment.id },
        data: {
          status: "SUCCESS",
          logs: deployment.logs + "\n✅ Déploiement terminé avec succès.",
        },
      });
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
    res.json(deployment);
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
    res.json(deployments);
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

    // Simule rollback
    const rollback = await prisma.deployment.create({
      data: {
        projectId,
        status: "SUCCESS",
        logs: "↩️ Rollback vers version précédente effectué avec succès.",
        targetUrl: deployment.targetUrl,
      },
    });

    res.json({ success: true, rollback });
  } catch (err) {
    console.error("❌ rollbackDeployment error:", err);
    res.status(500).json({ error: "SERVER_ERROR", message: "Erreur serveur" });
  }
}

// ✅ GET /deploy/:projectId/:deployId/logs → streaming des logs
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
