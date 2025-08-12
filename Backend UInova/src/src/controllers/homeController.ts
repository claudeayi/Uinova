import { prisma } from "../utils/prisma";
import { Request, Response } from "express";
import { toProjectCardDTO } from "../utils/dto";

export const homeSummary = async (req: any, res: Response) => {
  const userId = req.user?.sub;
  // Section "cartes" de ton écran
  const projects = await prisma.project.findMany({
    where: { ownerId: userId },
    orderBy: { updatedAt: "desc" },
    select: { id:true, name:true, tagline:true, icon:true, status:true, updatedAt:true }
  });
  const cards = projects.map(toProjectCardDTO);

  // Petits totaux si tu veux les afficher plus tard
  const totals = {
    enCours: projects.filter(p => p.status === "IN_PROGRESS").length,
    termines: projects.filter(p => p.status === "DONE").length,
    planifies: projects.filter(p => p.status === "PLANNED").length,
    total: projects.length,
  };

  res.json({ cards, totals });
};
