import { Request, Response } from "express";
import { prisma } from "../utils/prisma";

// ✅ POST /deploy/:projectId → lancer un déploiement
export async function startDeployment(req: Request, res: Response) {
  try {
    const { projectId } = req.params;
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: "Non autorisé" });

    // Vérifier que le projet existe et appartient bien à l’utilisateur
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ message: "Projet introuvable" });
    if (project.ownerId !== userId && (req as any).user?.role !== "ADMIN") {
      return res.status(403).json({ message: "Accès interdit à ce projet" });
    }

    // Créer un enregistrement de déploiement
    const deployment = await prisma.deployment.create({
      data: {
        projectId,
        status: "PENDING",
        logs: "🚀 Déploiement lancé...\n",
      },
    });

    // ⚡ Simulation : mise à jour async du statut (à remplacer par vraie infra)
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
    res.status(500).json({ message: "Erreur serveur" });
  }
}

// ✅ GET /deploy/:projectId/status → récupérer le dernier déploiement
export async function getDeploymentStatus(req: Request, res: Response) {
  try {
    const { projectId } = req.params;
    const deployment = await prisma.deployment.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });

    if (!deployment) {
      return res.status(404).json({ message: "Aucun déploiement trouvé" });
    }

    res.json(deployment);
  } catch (err) {
    console.error("❌ getDeploymentStatus error:", err);
    res.status(500).json({ message: "Erreur serveur" });
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
    res.status(500).json({ message: "Erreur serveur" });
  }
}
