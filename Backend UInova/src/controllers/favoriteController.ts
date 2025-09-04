import { Request, Response } from "express";
import { prisma } from "../utils/prisma";

/* ============================================================================
 *  FAVORITE CONTROLLER
 * ========================================================================== */

// ▶️ Liste les favoris de l’utilisateur
export async function listFavorites(req: Request, res: Response) {
  try {
    const favorites = await prisma.favorite.findMany({
      where: { userId: req.user?.id },
      include: {
        project: { select: { id: true, name: true, updatedAt: true } },
        template: { select: { id: true, title: true, updatedAt: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const mapped = favorites.map((f) => ({
      id: f.id,
      type: f.projectId ? "project" : "template",
      name: f.project?.name || f.template?.title || "Inconnu",
      shareId: f.template?.id || null,
      updatedAt: f.project?.updatedAt || f.template?.updatedAt || null,
    }));

    return res.json(mapped);
  } catch (err: any) {
    console.error("❌ listFavorites error:", err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
}

// ▶️ Ajouter un favori
export async function addFavorite(req: Request, res: Response) {
  try {
    const { itemId, type } = req.body;
    if (!itemId || !type) {
      return res.status(400).json({ error: "INVALID_PAYLOAD" });
    }

    const fav = await prisma.favorite.create({
      data: {
        userId: req.user!.id,
        ...(type === "project"
          ? { projectId: itemId }
          : { templateId: itemId }),
      },
    });

    return res.status(201).json(fav);
  } catch (err: any) {
    console.error("❌ addFavorite error:", err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
}

// ▶️ Supprimer un favori
export async function removeFavorite(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const fav = await prisma.favorite.findUnique({
      where: { id },
    });

    if (!fav || fav.userId !== req.user?.id) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    await prisma.favorite.delete({ where: { id } });
    return res.json({ success: true });
  } catch (err: any) {
    console.error("❌ removeFavorite error:", err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
}
