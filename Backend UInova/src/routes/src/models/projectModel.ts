// src/models/projectModel.ts
import { prisma } from "../utils/prisma";

type Id = string | number;
export type ProjectStatus = "PLANNED" | "IN_PROGRESS" | "DONE";

const selectProject = {
  id: true,
  ownerId: true,
  name: true,
  tagline: true,
  icon: true,
  status: true,
  json: true,
  createdAt: true,
  updatedAt: true,
};

// Conversion souple: accepte string ou number selon ton schéma Prisma
function toId(v: Id): any {
  const n = Number(v);
  return Number.isFinite(n) && String(n) === String(v) ? n : String(v);
}

/** DTO complet pour l’éditeur */
export type ProjectDTO = {
  id: Id;
  ownerId: Id;
  name: string;
  tagline: string | null;
  icon: string | null;
  status: ProjectStatus;
  json: any;
  createdAt: Date;
  updatedAt: Date;
};

/** DTO “card” (liste / dashboard) */
export type ProjectCardDTO = {
  id: Id;
  name: string;
  tagline: string | null;
  icon: string | null;
  status: ProjectStatus;
  updatedAt: Date;
};

export function toProjectDTO(p: any): ProjectDTO {
  return {
    id: p.id,
    ownerId: p.ownerId,
    name: p.name,
    tagline: p.tagline ?? null,
    icon: p.icon ?? null,
    status: p.status as ProjectStatus,
    json: p.json ?? {},
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export function toProjectCardDTO(p: any): ProjectCardDTO {
  return {
    id: p.id,
    name: p.name,
    tagline: p.tagline ?? null,
    icon: p.icon ?? null,
    status: p.status as ProjectStatus,
    updatedAt: p.updatedAt,
  };
}

/* =========================
 * LIST (pagination / tri / recherche)
 * ========================= */
export async function listProjectsByOwner(
  ownerId: Id,
  opts?: {
    status?: ProjectStatus;
    q?: string;
    page?: number;
    pageSize?: number;
    sort?: "updatedAt:desc" | "updatedAt:asc" | "name:asc" | "name:desc";
  }
): Promise<{ items: ProjectCardDTO[]; page: number; pageSize: number; total: number; totalPages: number }> {
  const page = Math.max(1, opts?.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts?.pageSize ?? 20));
  const [field, dir] = (opts?.sort ?? "updatedAt:desc").split(":") as ["updatedAt" | "name", "asc" | "desc"];

  const where: any = { ownerId: toId(ownerId) };
  if (opts?.status) where.status = opts.status;
  if (opts?.q) {
    where.OR = [
      { name: { contains: opts.q, mode: "insensitive" } },
      { tagline: { contains: opts.q, mode: "insensitive" } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      orderBy: { [field]: dir },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, name: true, tagline: true, icon: true, status: true, updatedAt: true },
    }),
  ]);

  return {
    items: rows.map(toProjectCardDTO),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** ⚠️ Alias compat (si ton ancien code utilisait userId au lieu de ownerId) */
export async function getProjectsByUser(userId: Id, opts?: Parameters<typeof listProjectsByOwner>[1]) {
  return listProjectsByOwner(userId, opts);
}

/* =========================
 * GET ONE
 * ========================= */
export async function getProjectById(id: Id): Promise<ProjectDTO | null> {
  const rec = await prisma.project.findUnique({ where: { id: toId(id) } as any, select: selectProject });
  return rec ? toProjectDTO(rec) : null;
}

/* =========================
 * CREATE
 * ========================= */
export async function createProject(data: {
  ownerId: Id;
  name: string;
  tagline?: string | null;
  icon?: string | null;
  status?: ProjectStatus; // default: PLANNED
  json?: any;             // schema initial de l’éditeur
}): Promise<ProjectDTO> {
  const rec = await prisma.project.create({
    data: {
      ownerId: toId(data.ownerId) as any,
      name: data.name,
      tagline: data.tagline ?? null,
      icon: data.icon ?? null,
      status: data.status ?? "PLANNED",
      json: data.json ?? {},
    },
    select: selectProject,
  });
  return toProjectDTO(rec);
}

/* =========================
 * UPDATE (patch)
 * ========================= */
export async function updateProject(
  id: Id,
  data: Partial<{
    name: string;
    tagline: string | null;
    icon: string | null;
    status: ProjectStatus;
    json: any;
  }>
): Promise<ProjectCardDTO> {
  const rec = await prisma.project.update({
    where: { id: toId(id) } as any,
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.tagline !== undefined ? { tagline: data.tagline } : {}),
      ...(data.icon !== undefined ? { icon: data.icon } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.json !== undefined ? { json: data.json } : {}),
    },
    select: { id: true, name: true, tagline: true, icon: true, status: true, updatedAt: true },
  });
  return toProjectCardDTO(rec);
}

/* =========================
 * DELETE
 * ========================= */
export async function deleteProject(id: Id): Promise<{ ok: true }> {
  await prisma.project.delete({ where: { id: toId(id) } as any });
  return { ok: true };
}

/* =========================
 * DUPLICATE
 * ========================= */
export async function duplicateProject(id: Id, newName?: string): Promise<ProjectCardDTO> {
  const src = await prisma.project.findUnique({
    where: { id: toId(id) } as any,
    select: { id: true, ownerId: true, name: true, tagline: true, icon: true, status: true, json: true },
  });
  if (!src) {
    const err: any = new Error("Project not found");
    err.status = 404;
    throw err;
  }

  const rec = await prisma.project.create({
    data: {
      ownerId: src.ownerId,
      name: newName ?? `${src.name} (copie)`,
      tagline: src.tagline,
      icon: src.icon,
      status: src.status as ProjectStatus,
      json: src.json ?? {},
    },
    select: { id: true, name: true, tagline: true, icon: true, status: true, updatedAt: true },
  });

  return toProjectCardDTO(rec);
}
