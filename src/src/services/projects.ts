// src/services/projects.ts
import http from "./http";
import { toast } from "react-hot-toast";

/* ============================================================================
 * Typings
 * ========================================================================== */
export type ProjectStatus = "draft" | "published" | "archived";

export interface Project {
  id: string;
  name: string;
  tagline?: string;
  icon?: string;
  status: ProjectStatus;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectPayload {
  name: string;
  tagline?: string;
  icon?: string;
  status?: ProjectStatus;
  workspaceId: string;
}

export interface ProjectStats {
  pages: number;
  collaborators: number;
  sizeMB: number;
}

export interface ProjectShare {
  url: string;
  token?: string;
  expiresAt?: string;
}

/* ============================================================================
 * Utils
 * ========================================================================== */
function emitEvent(name: string, detail?: any) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function handleError(err: any, context: string, userMsg: string) {
  console.error(`❌ ${context}:`, err);
  toast.error(userMsg);
  throw err;
}

/* ============================================================================
 * CRUD Projects
 * ========================================================================== */
export async function getProjects(workspaceId: string): Promise<Project[]> {
  try {
    const res = await http.get(`/projects?workspaceId=${workspaceId}`);
    return res.data || [];
  } catch (err) {
    return handleError(err, "getProjects", "Impossible de charger les projets.");
  }
}

export async function getProjectById(id: string): Promise<Project | null> {
  try {
    const res = await http.get(`/projects/${id}`);
    return res.data;
  } catch (err) {
    handleError(err, "getProjectById", "Projet introuvable.");
    return null;
  }
}

export async function createProject(data: CreateProjectPayload): Promise<Project> {
  try {
    const res = await http.post("/projects", data);
    toast.success("✅ Projet créé");
    emitEvent("project:created", res.data);
    return res.data;
  } catch (err) {
    return handleError(err, "createProject", "Erreur lors de la création du projet.");
  }
}

export async function updateProject(
  id: string,
  data: Partial<CreateProjectPayload>
): Promise<Project> {
  try {
    const res = await http.patch(`/projects/${id}`, data);
    toast.success("✅ Projet mis à jour");
    emitEvent("project:updated", res.data);
    return res.data;
  } catch (err) {
    return handleError(err, "updateProject", "Erreur lors de la mise à jour.");
  }
}

export async function deleteProject(id: string): Promise<void> {
  try {
    await http.delete(`/projects/${id}`);
    toast.success("🗑️ Projet supprimé");
    emitEvent("project:deleted", { id });
  } catch (err) {
    return handleError(err, "deleteProject", "Erreur lors de la suppression.");
  }
}

/* ============================================================================
 * Advanced Actions
 * ========================================================================== */
export async function duplicateProject(id: string): Promise<Project | null> {
  try {
    const res = await http.post(`/projects/${id}/duplicate`);
    toast.success("📑 Projet dupliqué");
    emitEvent("project:duplicated", res.data);
    return res.data;
  } catch (err) {
    handleError(err, "duplicateProject", "Erreur lors de la duplication.");
    return null;
  }
}

export async function publishProject(id: string): Promise<Project | null> {
  try {
    const res = await http.post(`/projects/${id}/publish`);
    toast.success("🚀 Projet publié");
    emitEvent("project:published", res.data);
    return res.data;
  } catch (err) {
    handleError(err, "publishProject", "Erreur lors de la publication.");
    return null;
  }
}

export async function shareProject(id: string): Promise<ProjectShare | null> {
  try {
    const res = await http.post(`/projects/${id}/share`);
    toast.success("🔗 Lien de partage généré");
    return res.data;
  } catch (err) {
    handleError(err, "shareProject", "Erreur lors du partage.");
    return null;
  }
}

export async function archiveProject(id: string): Promise<Project | null> {
  try {
    const res = await http.post(`/projects/${id}/archive`);
    toast.success("📦 Projet archivé");
    emitEvent("project:archived", res.data);
    return res.data;
  } catch (err) {
    handleError(err, "archiveProject", "Erreur lors de l’archivage.");
    return null;
  }
}

export async function restoreProject(id: string): Promise<Project | null> {
  try {
    const res = await http.post(`/projects/${id}/restore`);
    toast.success("♻️ Projet restauré");
    emitEvent("project:restored", res.data);
    return res.data;
  } catch (err) {
    handleError(err, "restoreProject", "Erreur lors de la restauration.");
    return null;
  }
}

export async function getProjectStats(id: string): Promise<ProjectStats | null> {
  try {
    const res = await http.get(`/projects/${id}/stats`);
    return res.data;
  } catch (err) {
    handleError(err, "getProjectStats", "Impossible de récupérer les statistiques.");
    return null;
  }
}

export async function transferProject(
  id: string,
  newWorkspaceId: string
): Promise<Project | null> {
  try {
    const res = await http.post(`/projects/${id}/transfer`, { workspaceId: newWorkspaceId });
    toast.success("📤 Projet transféré");
    emitEvent("project:transferred", res.data);
    return res.data;
  } catch (err) {
    handleError(err, "transferProject", "Erreur lors du transfert du projet.");
    return null;
  }
}

export async function getProjectHistory(id: string): Promise<any[]> {
  try {
    const res = await http.get(`/projects/${id}/history`);
    return res.data.data || [];
  } catch (err) {
    handleError(err, "getProjectHistory", "Impossible de récupérer l’historique.");
    return [];
  }
}
