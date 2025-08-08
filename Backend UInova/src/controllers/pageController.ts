import prisma from "../utils/prisma";
import { Request, Response } from "express";

export const list = async (req: Request, res: Response) => {
  const pages = await prisma.page.findMany({ where: { projectId: +req.params.projectId } });
  res.json(pages);
};

export const get = async (req: Request, res: Response) => {
  const page = await prisma.page.findUnique({ where: { id: +req.params.id } });
  res.json(page);
};

export const create = async (req: Request, res: Response) => {
  const page = await prisma.page.create({
    data: {
      name: req.body.name,
      data: req.body.data || [],
      projectId: +req.params.projectId
    }
  });
  res.status(201).json(page);
};

export const update = async (req: Request, res: Response) => {
  await prisma.page.update({
    where: { id: +req.params.id },
    data: { data: req.body.data || [] }
  });
  res.json({ message: "Page updated" });
};

export const remove = async (req: Request, res: Response) => {
  await prisma.page.delete({ where: { id: +req.params.id } });
  res.json({ message: "Page deleted" });
};
