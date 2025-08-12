// src/controllers/pageController.ts
import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../utils/prisma";

// (optionnels) services
import * as policy from "../services/policy";      // policy.canAccessProject(userId, projectId, "VIEW"|"EDIT")
let io: any = null;
try { io = require("../services/collab").io; } catch { /* ok si absent */ }

// =====================
// Helpers
// =====================
const toId = (v: any) => {
  if (v === undefined || v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) && String(n) === String(v) ? n : String(v);
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

async function ensureAccess(req: Request, projectId: string | number, need: "VIEW" | "EDIT") {
  const caller = ensureAuth(req);
  if (policy?.canAccessProject) {
    const ok = await policy.canAccessProject(caller.id, projectId, need);
    if (!ok) {
      const err: any = new Error("Forbidden");
      err.status = 403;
      throw err;
    }
    return caller.id;
  }
  // Fallback : propriétaire = accès
  const project = await prisma.project.findUnique({ where: { id: projectId as any }, select: { ownerId: true } });
  if (!project || project.ownerId !== caller.id) {
    const err: any = new Error("Forbidden");
    err.status = 403;
    throw err;
  }
  return caller.id;
}

const selectPage = {
  id: true,
  name: true,
  schema: true,          // JSON
  sortOrder: true,
  projectId: true,
  createdAt: true,
  updatedAt: true,
};

// =====================
// Validation
// =====================
const CreatePageSchema = z.object({
  name: z.string().min(1).max(120),
  schema: z.any().optional(),
  data: z.any().optional(), // compat ancien champ
});

const UpdatePageSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  schema: z.any().optional(),
  data: z.any().optional(), // compat ancien champ
});

const ReorderSchema = z.object({
  items: z.array(z.object({
    id: z.union([z.string(), z.number()]),
    sortOrder: z.number().int().min(0).max(1_000_000),
  })).min(1),
});

// =====================
// Controllers
// =====================

/**
 * GET /api/projects/:projectId/pages
 * Query: none
 */
export const list = async (req: Request, res: Response) => {
  const projectId = toId(req.params.projectId);
  if (!projectId) return res.status(400).json({ error: "projectId manquant" });

  await ensureAccess(req, projectId, "VIEW");

  const pages = await prisma.page.findMany({
    where: { projectId: projectId as any },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: selectPage,
  });

  res.json(pages);
};

/**
 * GET /api/pages/:id
 */
export const get = async (req: Request, res: Response) => {
  const id = toId(req.params.id);
  if (!id) return res.status(400).json({ error: "id manquant" });

  const page = await prisma.page.findUnique({
    where: { id } as any,
    select: { ...selectPage, project: { select: { id: true } } },
  });
  if (!page) return res.status(404).json({ error: "Page not found" });

  await ensureAccess(req, page.project.id, "VIEW");

  // retire project du payload final
  const { project, ...dto } = page as any;
  res.json(dto);
};

/**
 * POST /api/projects/:projectId/pages
 * Body: { name, schema? | data? }
 */
export const create = async (req: Request, res: Response) => {
  const projectId = toId(req.params.projectId);
  if (!projectId) return res.status(400).json({ error: "projectId manquant" });

  await ensureAccess(req, projectId, "EDIT");

  const body = CreatePageSchema.parse(req.body);
  const schema = body.schema ?? body.data ?? {}; // compat

  // calcul sortOrder (dernier + 1)
  const last = await prisma.page.findFirst({
    where: { projectId: projectId as any },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const sortOrder = (last?.sortOrder ?? -1) + 1;

  const page = await prisma.page.create({
    data: {
      name: body.name,
      schema,
      projectId: projectId as any,
      sortOrder,
    },
    select: selectPage,
  });

  if (io) io.to(`project:${projectId}`).emit("page:created", page);

  res.status(201).json(page);
};

/**
 * PUT /api/pages/:id
 * Body: { name?, schema? | data? }
 */
export const update = async (req: Request, res: Response) => {
  const id = toId(req.params.id);
  if (!id) return res.status(400).json({ error: "id manquant" });

  const page = await prisma.page.findUnique({
    where: { id } as any,
    select: { id: true, projectId: true },
  });
  if (!page) return res.status(404).json({ error: "Page not found" });

  await ensureAccess(req, page.projectId, "EDIT");

  const body = UpdatePageSchema.parse(req.body);
  const data: any = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.schema !== undefined) data.schema = body.schema;
  else if (body.data !== undefined) data.schema = body.data; // compat ancien champ

  const updated = await prisma.page.update({
    where: { id } as any,
    data,
    select: selectPage,
  });

  if (io) io.to(`project:${page.projectId}`).emit("page:updated", updated);

  res.json(updated);
};

/**
 * POST /api/projects/:projectId/pages/reorder
 * Body: { items: [{ id, sortOrder }] }
 */
export const reorder = async (req: Request, res: Response) => {
  const projectId = toId(req.params.projectId);
  if (!projectId) return res.status(400).json({ error: "projectId manquant" });

  await ensureAccess(req, projectId, "EDIT");

  const { items } = ReorderSchema.parse(req.body);

  // Vérifie que toutes les pages appartiennent au projet
  const ids = items.map(i => toId(i.id)) as (string | number)[];
  const pages = await prisma.page.findMany({
    where: { id: { in: ids as any }, projectId: projectId as any },
    select: { id: true },
  });
  if (pages.length !== ids.length) {
    return res.status(400).json({ error: "Certaines pages n'appartiennent pas au projet." });
  }

  // Mise à jour en transaction
  await prisma.$transaction(items.map(i =>
    prisma.page.update({
      where: { id: toId(i.id) as any },
      data: { sortOrder: i.sortOrder },
    })
  ));

  if (io) io.to(`project:${projectId}`).emit("page:reordered", items);

  res.json({ ok: true });
};

/**
 * POST /api/pages/:id/duplicate
 * Duplique une page (name + " (copie)") avec sortOrder = dernier + 1
 */
export const duplicate = async (req: Request, res: Response) => {
  const id = toId(req.params.id);
  if (!id) return res.status(400).json({ error: "id manquant" });

  const src = await prisma.page.findUnique({
    where: { id } as any,
    select: { id: true, name: true, schema: true, projectId: true },
  });
  if (!src) return res.status(404).json({ error: "Page not found" });

  await ensureAccess(req, src.projectId, "EDIT");

  const last = await prisma.page.findFirst({
    where: { projectId: src.projectId as any },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const sortOrder = (last?.sortOrder ?? -1) + 1;

  const copy = await prisma.page.create({
    data: {
      name: `${src.name} (copie)`,
      schema: src.schema ?? {},
      projectId: src.projectId as any,
      sortOrder,
    },
    select: selectPage,
  });

  if (io) io.to(`project:${src.projectId}`).emit("page:created", copy);

  res.status(201).json(copy);
};

/**
 * DELETE /api/pages/:id
 */
export const remove = async (req: Request, res: Response) => {
  const id = toId(req.params.id);
  if (!id) return res.status(400).json({ error: "id manquant" });

  const page = await prisma.page.findUnique({
    where: { id } as any,
    select: { id: true, projectId: true },
  });
  if (!page) return res.status(404).json({ error: "Page not found" });

  await ensureAccess(req, page.projectId, "EDIT");

  await prisma.page.delete({ where: { id } as any });

  if (io) io.to(`project:${page.projectId}`).emit("page:deleted", { id });

  res.json({ ok: true });
};
