// src/controllers/favoriteController.ts
import { Request, Response } from "express";
import { prisma } from "../utils/prisma";

/* ============================================================================
 *  FAVORITE CONTROLLER ENRICHI
 * ========================================================================== */

// ▶️ Liste les favoris de l’utilisateur (avec recherche + tri)
export async function listFavorites(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: "UNAUTHORIZED" });

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const search = String(req.query.search || "").trim();
    const sort = (req.query.sort as string) || "createdAt:desc";

    const [field, dir] = sort.split(":") as ["createdAt" | "updatedAt", "asc" | "desc"];

    const [favorites, total] = await Promise.all([
      prisma.favorite.findMany({
        where: {
          userId,
          OR: search
            ? [
                { project: { name: { contains: search, mode: "insensitive" } } },
                { template: { title: { contains: search, mode: "insensitive" } } },
              ]
            : undefined,
        },
        include: {
          project: { select: { id: true, name: true, updatedAt: true } },
          template: { select: { id: true, title: true, updatedAt: true } },
        },
        orderBy: { [field]: dir },
        skip,
        take: limit,
      }),
      prisma.favorite.count({ where: { userId } }),
    ]);

    const mapped = favorites.map((f) => ({
      id: f.id,
      type: f.projectId ? "project" : "template",
      itemId: f.projectId || f.templateId,
      name: f.project?.name || f.template?.title || "Inconnu",
      updatedAt: f.project?.updatedAt || f.template?.updatedAt || null,
    }));

    return res.json({
      success: true,
      data: mapped,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err: any) {
    console.error("❌ listFavorites error:", err);
    return res.status(500).json({ success: false, error: "INTERNAL_ERROR" });
  }
}

// ▶️ Vérifier si un item est déjà favori
export async function isFavorite(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: "UNAUTHORIZED" });

    const { itemId, type } = req.params;
    if (!itemId || !type) return res.status(400).json({ success: false, error: "INVALID_PARAMS" });

    const fav = await prisma.favorite.findFirst({
      where: {
        userId,
        ...(type === "project" ? { projectId: itemId } : { templateId: itemId }),
      },
    });

    return res.json({ success: true, isFavorite: !!fav });
  } catch (err: any) {
    console.error("❌ isFavorite error:", err);
    return res.status(500).json({ success: false, error: "INTERNAL_ERROR" });
  }
}

// ▶️ Ajouter un favori
export async function addFavorite(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: "UNAUTHORIZED" });

    const { itemId, type } = req.body;
    if (!itemId || !type) {
      return res.status(400).json({ success: false, error: "INVALID_PAYLOAD" });
    }

    const existing = await prisma.favorite.findFirst({
      where: { userId, ...(type === "project" ? { projectId: itemId } : { templateId: itemId }) },
    });
    if (existing) {
      return res.json({ success: true, message: "Déjà en favoris", data: existing });
    }

    const fav = await prisma.favorite.create({
      data: { userId, ...(type === "project" ? { projectId: itemId } : { templateId: itemId }) },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: "FAVORITE_ADDED",
        details: `${type}:${itemId}`,
        ip: req.ip,
        ua: req.headers["user-agent"] || null,
      },
    });

    return res.status(201).json({ success: true, data: fav });
  } catch (err: any) {
    console.error("❌ addFavorite error:", err);
    return res.status(500).json({ success: false, error: "INTERNAL_ERROR" });
  }
}

// ▶️ Supprimer un favori
export async function removeFavorite(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: "UNAUTHORIZED" });

    const { id } = req.params;
    const fav = await prisma.favorite.findUnique({ where: { id } });
    if (!fav || fav.userId !== userId) {
      return res.status(404).json({ success: false, error: "NOT_FOUND" });
    }

    await prisma.favorite.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId,
        action: "FAVORITE_REMOVED",
        details: `${fav.projectId || fav.templateId}`,
        ip: req.ip,
        ua: req.headers["user-agent"] || null,
      },
    });

    return res.json({ success: true, message: "Favori supprimé" });
  } catch (err: any) {
    console.error("❌ removeFavorite error:", err);
    return res.status(500).json({ success: false, error: "INTERNAL_ERROR" });
  }
}

// ▶️ Supprimer tous les favoris de l’utilisateur
export async function clearFavorites(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: "UNAUTHORIZED" });

    const result = await prisma.favorite.deleteMany({ where: { userId } });

    await prisma.auditLog.create({
      data: { userId, action: "FAVORITES_CLEARED", details: `Total ${result.count}` },
    });

    return res.json({ success: true, cleared: result.count });
  } catch (err: any) {
    console.error("❌ clearFavorites error:", err);
    return res.status(500).json({ success: false, error: "INTERNAL_ERROR" });
  }
}

// ▶️ Stats des favoris de l’utilisateur
export async function favoriteStats(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: "UNAUTHORIZED" });

    const [projects, templates] = await Promise.all([
      prisma.favorite.count({ where: { userId, projectId: { not: null } } }),
      prisma.favorite.count({ where: { userId, templateId: { not: null } } }),
    ]);

    return res.json({
      success: true,
      data: { total: projects + templates, projects, templates },
    });
  } catch (err: any) {
    console.error("❌ favoriteStats error:", err);
    return res.status(500).json({ success: false, error: "INTERNAL_ERROR" });
  }
}

// ▶️ Export des favoris (JSON, CSV, Markdown)
export async function exportFavorites(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: "UNAUTHORIZED" });

    const format = (req.query.format as string) || "json";
    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: { project: true, template: true },
    });

    if (format === "json") return res.json({ success: true, data: favorites });
    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv");
      res.send(
        favorites
          .map((f) => `${f.id},${f.project?.name || f.template?.title},${f.createdAt}`)
          .join("\n")
      );
      return;
    }
    if (format === "md") {
      res.type("markdown").send(
        favorites.map((f) => `- **${f.project?.name || f.template?.title}** ajouté le ${f.createdAt}`).join("\n")
      );
      return;
    }

    return res.status(400).json({ success: false, error: "FORMAT_NOT_SUPPORTED" });
  } catch (err: any) {
    console.error("❌ exportFavorites error:", err);
    return res.status(500).json({ success: false, error: "INTERNAL_ERROR" });
  }
}
