// src/controllers/favoriteController.ts
import { Request, Response } from "express";
import { prisma } from "../utils/prisma";

/* ============================================================================
 *  FAVORITE CONTROLLER
 * ========================================================================== */

// ▶️ Liste les favoris de l’utilisateur
export async function listFavorites(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: "UNAUTHORIZED" });

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [favorites, total] = await Promise.all([
      prisma.favorite.findMany({
        where: { userId },
        include: {
          project: { select: { id: true, name: true, updatedAt: true } },
          template: { select: { id: true, title: true, updatedAt: true } },
        },
        orderBy: { createdAt: "desc" },
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

    // Évite les doublons
    const existing = await prisma.favorite.findFirst({
      where: {
        userId,
        ...(type === "project" ? { projectId: itemId } : { templateId: itemId }),
      },
    });
    if (existing) {
      return res.json({ success: true, message: "Déjà en favoris", data: existing });
    }

    const fav = await prisma.favorite.create({
      data: {
        userId,
        ...(type === "project" ? { projectId: itemId } : { templateId: itemId }),
      },
    });

    await prisma.auditLog.create({
      data: { userId, action: "FAVORITE_ADDED", details: `${type}:${itemId}` },
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
      data: { userId, action: "FAVORITE_REMOVED", details: `${fav.projectId || fav.templateId}` },
    });

    return res.json({ success: true, message: "Favori supprimé" });
  } catch (err: any) {
    console.error("❌ removeFavorite error:", err);
    return res.status(500).json({ success: false, error: "INTERNAL_ERROR" });
  }
}
