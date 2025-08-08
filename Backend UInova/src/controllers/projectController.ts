import { Request, Response } from "express";
import prisma from "../utils/prisma";

export const getAll = async (req: Request, res: Response) => {
  const projects = await prisma.project.findMany({ where: { userId: req.user.id } });
  res.json(projects);
};

export const getOne = async (req: Request, res: Response) => {
  const project = await prisma.project.findUnique({ where: { id: +req.params.id } });
  res.json(project);
};

export const create = async (req: Request, res: Response) => {
  const project = await prisma.project.create({
    data: { name: req.body.name, userId: req.user.id }
  });
  res.status(201).json(project);
};

export const update = async (req: Request, res: Response) => {
  await prisma.project.update({
    where: { id: +req.params.id },
    data: { name: req.body.name }
  });
  res.json({ message: "Updated" });
};

export const remove = async (req: Request, res: Response) => {
  await prisma.project.delete({ where: { id: +req.params.id } });
  res.json({ message: "Deleted" });
};
