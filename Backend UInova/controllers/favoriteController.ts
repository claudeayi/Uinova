import { Request, Response } from "express";
import { prisma } from "../utils/prisma";

export async function listFavorites(req: Request, res: Response) {
  const userId = req.user.id;
  const favorites = await prisma.favorite.findMany({
    where: { userId },
    include: {
      project: true,
      template: true,
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(favorites);
}

export async function addFavorite(req: Request, res: Response) {
  const userId = req.user.id;
  const { projectId, templateId } = req.body;

  const fav = await prisma.favorite.create({
    data: { userId, projectId, templateId },
  });

  res.status(201).json(fav);
}

export async function removeFavorite(req: Request, res: Response) {
  const userId = req.user.id;
  const { id } = req.params;

  await prisma.favorite.delete({
    where: { id },
  });

  res.json({ success: true });
}
