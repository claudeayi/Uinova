// src/controllers/admin/projectsAdminController.ts
import { Request, Response } from "express";
import { prisma } from "../../utils/prisma";
import { z } from "zod";

/* ============================================================================
 * VALIDATION
 * ========================================================================== */
const IdSchema = z.string().min(1, "id requis");
const ValidateSchema = z.object({ validated: z.boolean() });

/* ============================================================================
 * HELPERS
 * ========================================================================== */
function ensureAdmin(req: Request) {
  const role = (req as any)?.user?.role;
  if (role !== "ADMIN") {
    const err: any = new Error("Forbidden");
    err.status = 403;
    throw err;
  }
}

async function auditLog(userId: string, action: string, metadata: any = {}) {
  try {
    await prisma.auditLog.create({ data: { userId, action, metadata } });
  } catch (err) {
    console.warn("⚠️ auditLog failed:", err);
  }
}

/* ============================================================================
 * CONTROLLERS
 * ========================================================================== */

// 📋 Liste de tous les projets
export async function listProjects(req: Request, res: Response) {
  try {
    ensureAdmin(req);

    const projects = await prisma.project.findMany({
      include: {
        owner: { select: { id: true, email: true } },
        _count: { select: { pages: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    res.json({ success: true, total: projects.length, data: projects });
  } catch (err) {
    console.error("❌ listProjects error:", err);
    res.status(500).json({ success: false, message: "Erreur récupération projets" });
  }
}

// 🔎 Détail d’un projet
export async function getProjectById(req: Request, res: Response) {
  try {
    ensureAdmin(req);
    const { id } = IdSchema.parse(req.params.id);

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, email: true } },
        pages: { select: { id: true, name: true, type: true, createdAt: true } },
      },
    });

    if (!project) return res.status(404).json({ success: false, message: "Projet introuvable" });

    await auditLog((req as any).user?.id, "ADMIN_PROJECT_VIEW", { projectId: id });

    res.json({ success: true, data: project });
  } catch (err: any) {
    console.error("❌ getProjectById error:", err);
    if (err?.code === "P2025") return res.status(404).json({ success: false, message: "Projet introuvable" });
    res.status(500).json({ success: false, message: "Erreur récupération projet" });
  }
}

// 🗑️ Suppression d’un projet
export async function deleteProject(req: Request, res: Response) {
  try {
    ensureAdmin(req);
    const { id } = IdSchema.parse(req.params.id);

    // Supprimer d'abord les pages et entités liées
    await prisma.page.deleteMany({ where: { projectId: id } });
    await prisma.deployment.deleteMany({ where: { projectId: id } }).catch(() => null);

    await prisma.project.delete({ where: { id } });

    await auditLog((req as any).user?.id, "ADMIN_PROJECT_DELETE", { projectId: id });

    res.json({ success: true, message: `Projet ${id} supprimé` });
  } catch (err: any) {
    console.error("❌ deleteProject error:", err);
    if (err?.code === "P2025") return res.status(404).json({ success: false, message: "Projet introuvable" });
    res.status(500).json({ success: false, message: "Erreur suppression projet" });
  }
}

// ✅ Validation d’un projet (ex: projet public avant publication)
export async function validateProject(req: Request, res: Response) {
  try {
    ensureAdmin(req);
    const { id } = IdSchema.parse(req.params.id);
    const { validated } = ValidateSchema.parse(req.body);

    const project = await prisma.project.update({
      where: { id },
      data: { validated },
    });

    await auditLog((req as any).user?.id, "ADMIN_PROJECT_VALIDATE", { projectId: id, validated });

    res.json({ success: true, data: project });
  } catch (err: any) {
    console.error("❌ validateProject error:", err);
    if (err?.code === "P2025") return res.status(404).json({ success: false, message: "Projet introuvable" });
    res.status(500).json({ success: false, message: "Erreur validation projet" });
  }
}

// 📊 Stats des projets
export async function projectStats(req: Request, res: Response) {
  try {
    ensureAdmin(req);

    const [total, validated, published, last7d] = await Promise.all([
      prisma.project.count(),
      prisma.project.count({ where: { validated: true } }),
      prisma.project.count({ where: { published: true } }),
      prisma.project.count({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) } },
      }),
    ]);

    res.json({
      success: true,
      data: {
        total,
        validated,
        published,
        newLast7d: last7d,
      },
    });
  } catch (err) {
    console.error("❌ projectStats error:", err);
    res.status(500).json({ success: false, message: "Erreur récupération stats projets" });
  }
}
