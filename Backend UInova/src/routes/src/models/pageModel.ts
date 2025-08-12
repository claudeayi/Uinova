// src/models/pageModel.ts
import { prisma } from "../utils/prisma";

type Id = string | number;

const selectPage = {
  id: true,
  projectId: true,
  name: true,
  schema: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
};

// Convertit un id string/number selon ton schéma Prisma
function toId(v: Id): any {
  const n = Number(v);
  return Number.isFinite(n) && String(n) === String(v) ? n : String(v);
}

// -------- DTO
export type PageDTO = {
  id: Id;
  projectId: Id;
  name: string;
  schema: any;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

function toPageDTO(p: any): PageDTO {
  return {
    id: p.id,
    projectId: p.projectId,
    name: p.name,
    schema: p.schema ?? {},
    sortOrder: p.sortOrder ?? 0,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

/* =========================
 * LIST (pagination/tri)
 * ========================= */
export async function getPagesByProject(
  projectId: Id,
  opts?: {
    page?: number;
    pageSize?: number;
    sort?: "sortOrder:asc" | "sortOrder:desc" | "createdAt:asc" | "createdAt:desc";
  }
): Promise<{ items: PageDTO[]; page: number; pageSize: number; total: number; totalPages: number }> {
  const page = Math.max(1, opts?.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, opts?.pageSize ?? 100));
  const [field, dir] = (opts?.sort ?? "sortOrder:asc").split(":") as ["sortOrder" | "createdAt", "asc" | "desc"];

  const where = { projectId: toId(projectId) as any };

  const [total, rows] = await Promise.all([
    prisma.page.count({ where }),
    prisma.page.findMany({
      where,
      orderBy: [{ [field]: dir }, { createdAt: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: selectPage,
    }),
  ]);

  return {
    items: rows.map(toPageDTO),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/* =========================
 * GET ONE
 * ========================= */
export async function getPageById(id: Id): Promise<PageDTO | null> {
  const rec = await prisma.page.findUnique({ where: { id: toId(id) } as any, select: selectPage });
  return rec ? toPageDTO(rec) : null;
}

/* =========================
 * CREATE (gère sortOrder auto)
 * data: { name, schema?, projectId }
 * ========================= */
export async function createPage(data: { name: string; schema?: any; projectId: Id }): Promise<PageDTO> {
  const last = await prisma.page.findFirst({
    where: { projectId: toId(data.projectId) as any },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const nextOrder = (last?.sortOrder ?? -1) + 1;

  const rec = await prisma.page.create({
    data: {
      name: data.name,
      schema: data.schema ?? {},
      projectId: toId(data.projectId) as any,
      sortOrder: nextOrder,
    },
    select: selectPage,
  });
  return toPageDTO(rec);
}

/* =========================
 * UPDATE (name/schema)
 * data: Partial<{ name; schema }>
 * ========================= */
export async function updatePage(id: Id, data: Partial<{ name: string; schema: any }>): Promise<PageDTO> {
  const rec = await prisma.page.update({
    where: { id: toId(id) } as any,
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.schema !== undefined ? { schema: data.schema } : {}),
    },
    select: selectPage,
  });
  return toPageDTO(rec);
}

/* =========================
 * DELETE
 * ========================= */
export async function deletePage(id: Id): Promise<{ ok: true }> {
  await prisma.page.delete({ where: { id: toId(id) } as any });
  return { ok: true };
}

/* =========================
 * REORDER (transaction)
 * items: [{ id, sortOrder }]
 * ========================= */
export async function reorderPages(projectId: Id, items: { id: Id; sortOrder: number }[]): Promise<{ ok: true }> {
  if (!items.length) return { ok: true };

  // Vérifie que les pages appartiennent bien au projet
  const ids = items.map(i => toId(i.id));
  const count = await prisma.page.count({ where: { id: { in: ids as any }, projectId: toId(projectId) as any } });
  if (count !== items.length) {
    const err: any = new Error("Certaines pages n'appartiennent pas au projet.");
    err.status = 400;
    throw err;
  }

  await prisma.$transaction(
    items.map(i =>
      prisma.page.update({ where: { id: toId(i.id) } as any, data: { sortOrder: i.sortOrder } })
    )
  );
  return { ok: true };
}

/* =========================
 * DUPLICATE (copy schema)
 * ========================= */
export async function duplicatePage(id: Id): Promise<PageDTO> {
  const src = await prisma.page.findUnique({
    where: { id: toId(id) } as any,
    select: { id: true, name: true, schema: true, projectId: true },
  });
  if (!src) {
    const err: any = new Error("Page not found");
    err.status = 404;
    throw err;
  }

  const last = await prisma.page.findFirst({
    where: { projectId: src.projectId as any },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const nextOrder = (last?.sortOrder ?? -1) + 1;

  const rec = await prisma.page.create({
    data: {
      name: `${src.name} (copie)`,
      schema: src.schema ?? {},
      projectId: src.projectId as any,
      sortOrder: nextOrder,
    },
    select: selectPage,
  });

  return toPageDTO(rec);
}
