import { Request, Response } from "express";
import { prisma } from "../utils/prisma";

/* ============================================================================
 * FAVORITES CONTROLLER
 * ============================================================================
 */
export async function listFavorites(req: Request, res: Response) {
  try {
    const favorites = await prisma.favorite.findMany({
      where: { userId: req.user!.id },
      include: { item: true },
      orderBy: { createdAt: "desc" },
    });

    res.json(favorites.map(f => ({
      id: f.id,
      type: f.item ? "template" : "project",
      name: f.item?.title || f.project?.name || "Sans titre",
      shareId: f.project?.id,
      updatedAt: f.item?.updatedAt || f.project?.updatedAt,
    })));
  } catch (err: any) {
    console.error("❌ listFavorites error:", err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
}

export async function addFavorite(req: Request, res: Response) {
  try {
    const { itemId, projectId } = req.body;

    const fav = await prisma.favorite.create({
      data: {
        userId: req.user!.id,
        itemId: itemId || null,
        projectId: projectId || null,
      },
    });

    res.status(201).json(fav);
  } catch (err: any) {
    console.error("❌ addFavorite error:", err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
}

export async function removeFavorite(req: Request, res: Response) {
  try {
    await prisma.favorite.delete({
      where: { id: req.params.id },
    });

    res.status(204).end();
  } catch (err: any) {
    console.error("❌ removeFavorite error:", err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
}
