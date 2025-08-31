import { Request, Response } from "express";
import { prisma } from "../../utils/prisma";

/* ============================================================================
 *  PROJECTS ADMIN CONTROLLER
 * ========================================================================== */

// 📋 Liste de tous les projets
export async function listProjects(_req: Request, res: Response) {
  try {
    const projects = await prisma.project.findMany({
      include: {
        owner: { select: { id: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: projects });
  } catch (err) {
    console.error("❌ listProjects error:", err);
    res.status(500).json({ success: false, message: "Erreur récupération projets" });
  }
}

// 🔎 Détail d’un projet
export async function getProjectById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, email: true } },
        pages: { select: { id: true, name: true, type: true } },
      },
    });
    if (!project) return res.status(404).json({ success: false, message: "Projet introuvable" });
    res.json({ success: true, data: project });
  } catch (err) {
    console.error("❌ getProjectById error:", err);
    res.status(500).json({ success: false, message: "Erreur récupération projet" });
  }
}

// 🗑️ Suppression d’un projet
export async function deleteProject(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Supprimer d'abord les pages et autres entités liées si besoin
    await prisma.page.deleteMany({ where: { projectId: id } });
    await prisma.project.delete({ where: { id } });

    res.json({ success: true, message: `Projet ${id} supprimé` });
  } catch (err) {
    console.error("❌ deleteProject error:", err);
    res.status(500).json({ success: false, message: "Erreur suppression projet" });
  }
}

// ✅ Validation d’un projet (ex: projet public avant publication)
export async function validateProject(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { validated } = req.body;

    const project = await prisma.project.update({
      where: { id },
      data: { validated: Boolean(validated) },
    });

    res.json({ success: true, data: project });
  } catch (err) {
    console.error("❌ validateProject error:", err);
    res.status(500).json({ success: false, message: "Erreur validation projet" });
  }
}
