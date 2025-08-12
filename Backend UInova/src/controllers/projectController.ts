import { prisma } from "../utils/prisma";
import { Response } from "express";
import { toProjectCardDTO } from "../utils/dto";

export const listProjects = async (req: any, res: Response) => {
  const { status } = req.query as { status?: "EN_COURS"|"TERMINE"|"PLANIFIE" };
  const userId = req.user.sub;

  const map: Record<string,string> = {
    EN_COURS: "IN_PROGRESS",
    TERMINE: "DONE",
    PLANIFIE: "PLANNED",
  };
  const where: any = { ownerId: userId };
  if (status && map[status]) where.status = map[status];

  const items = await prisma.project.findMany({
    where, orderBy: { updatedAt: "desc" },
    select: { id:true, name:true, tagline:true, icon:true, status:true, updatedAt:true }
  });
  res.json(items.map(toProjectCardDTO));
};

export const createProject = async (req: any, res: Response) => {
  const { name, tagline, icon, status } = req.body as {
    name: string; tagline?: string; icon?: string; status?: "EN_COURS"|"TERMINE"|"PLANIFIE"
  };
  const map: any = { EN_COURS: "IN_PROGRESS", TERMINE: "DONE", PLANIFIE: "PLANNED" };
  const p = await prisma.project.create({
    data: {
      ownerId: req.user.sub,
      name,
      tagline: tagline || null,
      icon: icon || null,
      status: status ? map[status] : "PLANNED",
      json: {}
    },
    select: { id:true, name:true, tagline:true, icon:true, status:true, updatedAt:true }
  });
  res.status(201).json(toProjectCardDTO(p));
};

export const getProject = async (req: any, res: Response) => {
  const p = await prisma.project.findFirst({
    where: { id: req.params.id, ownerId: req.user.sub },
    select: { id:true, name:true, tagline:true, icon:true, status:true, json:true, updatedAt:true, createdAt:true }
  });
  if (!p) return res.status(404).json({ error: "Not found" });
  // détail projet (l’éditeur peut lire p.json)
  res.json({
    id: p.id,
    title: p.name,
    subtitle: p.tagline,
    icon: p.icon,
    status: p.status === "IN_PROGRESS" ? "EN_COURS" : p.status === "DONE" ? "TERMINE" : "PLANIFIE",
    schema: p.json || {},
    updatedAt: p.updatedAt, createdAt: p.createdAt
  });
};

export const updateProject = async (req: any, res: Response) => {
  const { name, tagline, icon, status, schema } = req.body as {
    name?: string; tagline?: string; icon?: string; status?: "EN_COURS"|"TERMINE"|"PLANIFIE"; schema?: any
  };
  const map: any = { EN_COURS: "IN_PROGRESS", TERMINE: "DONE", PLANIFIE: "PLANNED" };

  const p = await prisma.project.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(tagline !== undefined ? { tagline } : {}),
      ...(icon !== undefined ? { icon } : {}),
      ...(status ? { status: map[status] } : {}),
      ...(schema !== undefined ? { json: schema } : {}),
    },
    select: { id:true, name:true, tagline:true, icon:true, status:true, updatedAt:true }
  });
  res.json(toProjectCardDTO(p));
};
