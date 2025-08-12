// src/utils/dto.ts

/** =========================
 * Types & Helpers généraux
 * ========================= */
export type Id = string | number;

export function normalizeId(v: Id): string {
  return typeof v === "number" ? String(v) : v;
}

export function toISO(d: Date | string): string {
  return (d instanceof Date ? d : new Date(d)).toISOString();
}

/** =========================
 * Statuts Projet (DB ⇄ API)
 * DB:    PLANNED | IN_PROGRESS | DONE
 * API:   PLANIFIE | EN_COURS   | TERMINE
 * ========================= */
export type ProjectStatusDB = "PLANNED" | "IN_PROGRESS" | "DONE";
export type ProjectStatusAPI = "PLANIFIE" | "EN_COURS" | "TERMINE";

const DB_TO_API: Record<ProjectStatusDB, ProjectStatusAPI> = {
  PLANNED: "PLANIFIE",
  IN_PROGRESS: "EN_COURS",
  DONE: "TERMINE",
};

const API_TO_DB: Record<ProjectStatusAPI, ProjectStatusDB> = {
  PLANIFIE: "PLANNED",
  EN_COURS: "IN_PROGRESS",
  TERMINE: "DONE",
};

export function mapStatusToAPI(s: ProjectStatusDB): ProjectStatusAPI {
  return DB_TO_API[s] ?? "PLANIFIE";
}

export function mapStatusFromAPI(s: ProjectStatusAPI): ProjectStatusDB {
  return API_TO_DB[s] ?? "PLANNED";
}

/** =========================
 * ProjectCardDTO (liste/dashboard)
 * ========================= */
export type ProjectCardDTO = {
  id: string;
  title: string;           // name
  subtitle?: string;       // tagline
  status: ProjectStatusAPI;
  icon?: string;           // emoji ou URL
  updatedAt: string;       // ISO
};

/**
 * Transforme un enregistrement Project en ProjectCardDTO
 * Usage: select minimal côté Prisma:
 *  select: { id:true, name:true, tagline:true, icon:true, status:true, updatedAt:true }
 */
export function toProjectCardDTO(p: {
  id: Id;
  name: string;
  tagline: string | null;
  icon: string | null;
  status: ProjectStatusDB;
  updatedAt: Date | string;
}): ProjectCardDTO {
  return {
    id: normalizeId(p.id),
    title: p.name,
    subtitle: p.tagline || undefined,
    status: mapStatusToAPI(p.status),
    icon: p.icon || undefined,
    updatedAt: toISO(p.updatedAt),
  };
}

/** =========================
 * ProjectDetailDTO (éditeur)
 * Optionnel — pratique pour /projects/:id
 * ========================= */
export type ProjectDetailDTO = {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  status: ProjectStatusAPI;
  schema: any;            // correspond à project.json côté DB
  createdAt: string;
  updatedAt: string;
};

export function toProjectDetailDTO(p: {
  id: Id;
  name: string;
  tagline: string | null;
  icon: string | null;
  status: ProjectStatusDB;
  json: any;
  createdAt: Date | string;
  updatedAt: Date | string;
}): ProjectDetailDTO {
  return {
    id: normalizeId(p.id),
    title: p.name,
    subtitle: p.tagline || undefined,
    icon: p.icon || undefined,
    status: mapStatusToAPI(p.status),
    schema: p.json ?? {},
    createdAt: toISO(p.createdAt),
    updatedAt: toISO(p.updatedAt),
  };
}

/** =========================
 * (Optionnel) Aides de validation légère
 * ========================= */
export function isProjectStatusAPI(v: any): v is ProjectStatusAPI {
  return v === "PLANIFIE" || v === "EN_COURS" || v === "TERMINE";
}

export function isProjectStatusDB(v: any): v is ProjectStatusDB {
  return v === "PLANNED" || v === "IN_PROGRESS" || v === "DONE";
}
