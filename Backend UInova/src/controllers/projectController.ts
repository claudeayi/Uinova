// src/controllers/projectController.ts
import { Response, Request } from "express";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import { toProjectCardDTO } from "../utils/dto";

// (optionnel) pour du RBAC fin par projet ; sinon on garde le fallback "owner"
import * as policy from "../services/policy";

// =====================
// Helpers & constantes
// =====================
const mapFrToInternal: Record<string, "IN_PROGRESS" | "DONE" | "PLANNED"> = {
  EN_COURS: "IN_PROGRESS",
  TERMINE: "DONE",
  PLANIFIE: "PLANNED",
};
const mapInternalToFr: Record<"IN_PROGRESS" | "DONE" | "PLANNED", "EN_COURS" | "TERMINE" | "PLANIFIE"> = {
  IN_PROGRESS: "EN_COURS",
  DONE: "TERMINE",
  PLANNED: "PLANIFIE",
};

function ensureAuth(req: Request) {
  const u = (req as any).user;
  if (!u?.sub && !u?.id) {
    const err: any = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }
  return { id: u.sub || u.id, role: u.role || "USER" };
}

async function ensureCanAccessProject(userId: string, projectId: string, need: "VIEW" | "EDIT") {
  if (policy?.canAccessProject) {
    const ok = await policy.canAccessProject(userId, projectId, need);
    if (!ok) {
      const err: any = new Error("Forbidden");
      err.status = 403;
      throw err;
    }
    return;
  }
  // Fallback: propriétaire
  const p = await prisma.project.findUnique({ where: { id: projectId }, select: { ownerId: true } });
  if (!p || p.ownerId !== userId) {
    const err: any = new Error("Forbidden");
    err.status = 403;
    throw err;
  }
}

// =====================
// Validation
// =====================
const ListQuerySchema = z.object({
  status: z.enum(["EN_COURS", "TERMINE", "PLANIFIE"]).optional(),
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["updatedAt:desc", "updatedAt:asc", "name:asc", "name:desc"]).default("updatedAt:desc"),
});

const CreateSchema = z.object({
  name: z.string().min(1).max(120),
  tagline: z.string().max(200).optional(),
  icon: z.string().max(120).optional(),
  status: z.enum(["EN_COURS", "TERMINE", "PLANIFIE"]).optional(),
  schema: z.any().optional(), // si tu crées avec un premier schema
});

const UpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  tagline: z.string().max(200).optional().or(z.literal(null)),
  icon: z.string().max(120).optional().or(z.literal(null)),
  status: z.enum(["EN_COURS", "TERMINE", "PLANIFIE"]).optional(),
  schema: z.any().optional(), // JSON complet de l’éditeur
});

// =====================
// Controllers
// =====================

/**
 * GET /api/projects
 * Query: status?, q?, page=1, pageSize=20, sort=updatedAt:desc
 * Response: { items, page, pageSize, total, totalPages }
 */
export const listProjects = async (req: Request, res: Response) => {
  const user = ensureAuth(req);
  const { status, q, page, pageSize, sort } = ListQuerySchema.parse(req.query);

  const where: any = { ownerId: user.id };
  if (status) where.status = mapFrToInternal[status];
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { tagline: { contains: q, mode: "insensitive" } },
    ];
  }

  const [field, dir] = sort.split(":") as ["updatedAt" | "name", "asc" | "desc"];
  const orderBy: any = { [field]: dir };

  const [total, rows] = await Promise.all([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, name: true, tagline: true, icon: true, status: true, updatedAt: true },
    }),
  ]);

  res.json({
    items: rows.map(toProjectCardDTO),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
};

/**
 * POST /api/projects
 * Body: { name, tagline?, icon?, status?, schema? }
 * Response: ProjectCardDTO
 */
export const createProject = async (req: Request, res: Response) => {
  const user = ensureAuth(req);
  const body = CreateSchema.parse(req.body);

  const p = await prisma.project.create({
    data: {
      ownerId: user.id,
      name: body.name,
      tagline: body.tagline ?? null,
      icon: body.icon ?? null,
      status: body.status ? mapFrToInternal[body.status] : "PLANNED",
      json: body.schema ?? {}, // ton éditeur peut démarrer vide
    },
    select: { id: true, name: true, tagline: true, icon: true, status: true, updatedAt: true },
  });

  res.status(201).json(toProjectCardDTO(p));
};

/**
 * GET /api/projects/:id
 * Response: { id, title, subtitle, icon, status(FR), schema, updatedAt, createdAt }
 */
export const getProject = async (req: Request, res: Response) => {
  const user = ensureAuth(req);

  const p = await prisma.project.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      ownerId: true,
      name: true,
      tagline: true,
      icon: true,
      status: true,
      json: true,
      updatedAt: true,
      createdAt: true,
    },
  });
  if (!p) return res.status(404).json({ error: "Not found" });

  await ensureCanAccessProject(user.id, p.id, "VIEW");

  res.json({
    id: p.id,
    title: p.name,
    subtitle: p.tagline,
    icon: p.icon,
    status: mapInternalToFr[p.status as "IN_PROGRESS" | "DONE" | "PLANNED"],
    schema: p.json || {},
    updatedAt: p.updatedAt,
    createdAt: p.createdAt,
  });
};

/**
 * PUT /api/projects/:id
 * Body: { name?, tagline?, icon?, status?, schema? }
 * Response: ProjectCardDTO
 */
export const updateProject = async (req: Request, res: Response) => {
  const user = ensureAuth(req);
  const body = UpdateSchema.parse(req.body);

  // contrôle d’accès (EDIT)
  await ensureCanAccessProject(user.id, req.params.id, "EDIT");

  const data: any = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.tagline !== undefined) data.tagline = body.tagline;
  if (body.icon !== undefined) data.icon = body.icon;
  if (body.status) data.status = mapFrToInternal[body.status];
  if (body.schema !== undefined) data.json = body.schema;

  const p = await prisma.project.update({
    where: { id: req.params.id },
    data,
    select: { id: true, name: true, tagline: true, icon: true, status: true, updatedAt: true },
  });

  res.json(toProjectCardDTO(p));
};

/**
 * DELETE /api/projects/:id
 * Response: { ok: true }
 */
export const deleteProject = async (req: Request, res: Response) => {
  const user = ensureAuth(req);
  await ensureCanAccessProject(user.id, req.params.id, "EDIT");

  await prisma.project.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
};

/**
 * POST /api/projects/:id/duplicate
 * Duplique un projet (name + " (copie)") avec le même schema
 * Response: ProjectCardDTO
 */
export const duplicateProject = async (req: Request, res: Response) => {
  const user = ensureAuth(req);

  const src = await prisma.project.findUnique({
    where: { id: req.params.id },
    select: { id: true, ownerId: true, name: true, tagline: true, icon: true, status: true, json: true },
  });
  if (!src) return res.status(404).json({ error: "Not found" });

  await ensureCanAccessProject(user.id, src.id, "VIEW");

  const copy = await prisma.project.create({
    data: {
      ownerId: user.id,
      name: `${src.name} (copie)`,
      tagline: src.tagline,
      icon: src.icon,
      status: src.status,
      json: src.json ?? {},
    },
    select: { id: true, name: true, tagline: true, icon: true, status: true, updatedAt: true },
  });

  res.status(201).json(toProjectCardDTO(copy));
};
