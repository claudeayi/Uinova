// src/controllers/pageController.ts
import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import * as policy from "../services/policy";

let io: any = null;
try {
  io = require("../services/collab").io;
} catch {
  /* ok si absent */
}

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
  schema: true,
  sortOrder: true,
  projectId: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
};

// =====================
// Validation
// =====================
const CreatePageSchema = z.object({
  name: z.string().min(1).max(120),
  schema: z.any().optional(),
  data: z.any().optional(),
});

const UpdatePageSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  schema: z.any().optional(),
  data: z.any().optional(),
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

// 📂 Liste des pages
export const list = async (req: Request, res: Response) => {
  try {
    const projectId = toId(req.params.projectId);
    if (!projectId) return res.status(400).json({ success: false, error: "projectId manquant" });

    await ensureAccess(req, projectId, "VIEW");

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [pages, total] = await Promise.all([
      prisma.page.findMany({
        where: { projectId: projectId as any, archivedAt: null },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: selectPage,
        skip,
        take: limit,
      }),
      prisma.page.count({ where: { projectId: projectId as any, archivedAt: null } }),
    ]);

    res.json({
      success: true,
      data: pages,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (e: any) {
    console.error("❌ listPages error:", e);
    res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
};

// 📑 Récupérer une page
export const get = async (req: Request, res: Response) => {
  try {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ success: false, error: "id manquant" });

    const page = await prisma.page.findUnique({
      where: { id } as any,
      select: { ...selectPage, project: { select: { id: true } } },
    });
    if (!page) return res.status(404).json({ success: false, error: "Page not found" });

    await ensureAccess(req, page.project.id, "VIEW");
    const { project, ...dto } = page as any;
    res.json({ success: true, data: dto });
  } catch (e: any) {
    console.error("❌ getPage error:", e);
    res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
};

// ➕ Créer une page
export const create = async (req: Request, res: Response) => {
  try {
    const projectId = toId(req.params.projectId);
    if (!projectId) return res.status(400).json({ success: false, error: "projectId manquant" });

    await ensureAccess(req, projectId, "EDIT");

    const body = CreatePageSchema.parse(req.body);
    const schema = body.schema ?? body.data ?? {};

    const last = await prisma.page.findFirst({
      where: { projectId: projectId as any },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const sortOrder = (last?.sortOrder ?? -1) + 1;

    const page = await prisma.page.create({
      data: { name: body.name, schema, projectId: projectId as any, sortOrder },
      select: selectPage,
    });

    if (io) io.to(`project:${projectId}`).emit("page:created", page);
    await prisma.auditLog.create({ data: { userId: (req as any).user?.id, action: "PAGE_CREATED", details: page.name } });

    res.status(201).json({ success: true, data: page });
  } catch (e: any) {
    console.error("❌ createPage error:", e);
    res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
};

// ✏️ Modifier une page
export const update = async (req: Request, res: Response) => {
  try {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ success: false, error: "id manquant" });

    const page = await prisma.page.findUnique({ where: { id } as any, select: { id: true, projectId: true } });
    if (!page) return res.status(404).json({ success: false, error: "Page not found" });

    await ensureAccess(req, page.projectId, "EDIT");

    const body = UpdatePageSchema.parse(req.body);
    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.schema !== undefined) data.schema = body.schema;
    else if (body.data !== undefined) data.schema = body.data;

    const updated = await prisma.page.update({ where: { id } as any, data, select: selectPage });

    if (io) io.to(`project:${page.projectId}`).emit("page:updated", updated);
    await prisma.auditLog.create({ data: { userId: (req as any).user?.id, action: "PAGE_UPDATED", details: updated.name } });

    res.json({ success: true, data: updated });
  } catch (e: any) {
    console.error("❌ updatePage error:", e);
    res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
};

// 🔀 Réordonner
export const reorder = async (req: Request, res: Response) => {
  try {
    const projectId = toId(req.params.projectId);
    if (!projectId) return res.status(400).json({ success: false, error: "projectId manquant" });

    await ensureAccess(req, projectId, "EDIT");
    const { items } = ReorderSchema.parse(req.body);

    const ids = items.map((i) => toId(i.id)) as (string | number)[];
    const pages = await prisma.page.findMany({
      where: { id: { in: ids as any }, projectId: projectId as any },
      select: { id: true },
    });
    if (pages.length !== ids.length) {
      return res.status(400).json({ success: false, error: "Certaines pages n'appartiennent pas au projet." });
    }

    await prisma.$transaction(
      items.map((i) => prisma.page.update({ where: { id: toId(i.id) as any }, data: { sortOrder: i.sortOrder } }))
    );

    if (io) io.to(`project:${projectId}`).emit("page:reordered", items);
    await prisma.auditLog.create({ data: { userId: (req as any).user?.id, action: "PAGE_REORDERED", details: `${items.length} pages` } });

    res.json({ success: true, message: "Pages réordonnées" });
  } catch (e: any) {
    console.error("❌ reorderPages error:", e);
    res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
};

// 📄 Dupliquer une page
export const duplicate = async (req: Request, res: Response) => {
  try {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ success: false, error: "id manquant" });

    const src = await prisma.page.findUnique({ where: { id } as any, select: { id: true, name: true, schema: true, projectId: true } });
    if (!src) return res.status(404).json({ success: false, error: "Page not found" });

    await ensureAccess(req, src.projectId, "EDIT");

    const last = await prisma.page.findFirst({
      where: { projectId: src.projectId as any },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const sortOrder = (last?.sortOrder ?? -1) + 1;

    const copy = await prisma.page.create({
      data: { name: `${src.name} (copie)`, schema: src.schema ?? {}, projectId: src.projectId as any, sortOrder },
      select: selectPage,
    });

    if (io) io.to(`project:${src.projectId}`).emit("page:created", copy);
    await prisma.auditLog.create({ data: { userId: (req as any).user?.id, action: "PAGE_DUPLICATED", details: copy.name } });

    res.status(201).json({ success: true, data: copy });
  } catch (e: any) {
    console.error("❌ duplicatePage error:", e);
    res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
};

// ❌ Archiver une page (soft delete)
export const remove = async (req: Request, res: Response) => {
  try {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ success: false, error: "id manquant" });

    const page = await prisma.page.findUnique({ where: { id } as any, select: { id: true, projectId: true } });
    if (!page) return res.status(404).json({ success: false, error: "Page not found" });

    await ensureAccess(req, page.projectId, "EDIT");

    await prisma.page.update({ where: { id } as any, data: { archivedAt: new Date() } });

    if (io) io.to(`project:${page.projectId}`).emit("page:archived", { id });
    await prisma.auditLog.create({ data: { userId: (req as any).user?.id, action: "PAGE_ARCHIVED", details: `Page ${id}` } });

    res.json({ success: true, message: "Page archivée" });
  } catch (e: any) {
    console.error("❌ removePage error:", e);
    res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
};

// ♻️ Restaurer une page
export const restore = async (req: Request, res: Response) => {
  try {
    const id = toId(req.params.id);
    if (!id) return res.status(400).json({ success: false, error: "id manquant" });

    const page = await prisma.page.findUnique({ where: { id } as any, select: { id: true, projectId: true } });
    if (!page) return res.status(404).json({ success: false, error: "Page not found" });

    await ensureAccess(req, page.projectId, "EDIT");

    const restored = await prisma.page.update({ where: { id } as any, data: { archivedAt: null } });

    if (io) io.to(`project:${page.projectId}`).emit("page:restored", restored);
    await prisma.auditLog.create({ data: { userId: (req as any).user?.id, action: "PAGE_RESTORED", details: `Page ${id}` } });

    res.json({ success: true, data: restored });
  } catch (e: any) {
    console.error("❌ restorePage error:", e);
    res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
};
