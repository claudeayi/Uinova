import { Request, Response } from "express";
import { prisma } from "../utils/prisma";

export async function listTemplates(req: Request, res: Response) {
  const templates = await prisma.marketplaceItem.findMany({
    where: { published: true },
    orderBy: { updatedAt: "desc" },
    include: { owner: { select: { id: true, email: true } } },
  });
  res.json(templates);
}

export async function getTemplate(req: Request, res: Response) {
  const { id } = req.params;
  const tpl = await prisma.marketplaceItem.findUnique({
    where: { id },
    include: { owner: { select: { id: true, email: true } } },
  });
  if (!tpl) return res.status(404).json({ error: "Template not found" });
  res.json(tpl);
}
