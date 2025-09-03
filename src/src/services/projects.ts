import http from "./http";
import { toast } from "react-hot-toast";

/* ============================================================================
 * Interfaces
 * ========================================================================== */
export interface Project {
  id: string;
  name: string;
  tagline?: string;
  icon?: string;
  status: "draft" | "published" | "archived";
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectPayload {
  name: string;
  tagline?: string;
  icon?: string;
  status?: "draft" | "published" | "archived";
  workspaceId: string;
}

/* ============================================================================
 * CRUD Projets
 * ========================================================================== */

/**
 * 📂 Récupère tous les projets d’un workspace
 */
export async function getProjects(workspaceId: string): Promise<Project[]> {
  try {
    const res = await http.get(`/projects?workspaceId=${workspaceId}`);
    return res.data;
  } catch (err) {
    console.error("❌ getProjects error:", err);
    toast.error("Impossible de charger les projets.");
    return [];
  }
}

/**
 * 📂 Récupère un projet spécifique
 */
export async function getProjectById(id: string): Promise<Project | null> {
  try {
    const res = await http.get(`/projects/${id}`);
    return res.data;
  } catch (err) {
    console.error("❌ getProjectById error:", err);
    toast.error("Projet introuvable.");
    return null;
  }
}

/**
 * ➕ Crée un projet
 */
export async function createProject(
  data: CreateProjectPayload
): Promise<Project> {
  try {
    const res = await http.post("/projects", data);
    return res.data;
  } catch (err) {
    console.error("❌ createProject error:", err);
    toast.error("Erreur lors de la création du projet.");
    throw err;
  }
}

/**
 * ✏️ Met à jour un projet
 */
export async function updateProject(
  id: string,
  data: Partial<CreateProjectPayload>
): Promise<Project> {
  try {
    const res = await http.patch(`/projects/${id}`, data);
    toast.success("✅ Projet mis à jour");
    return res.data;
  } catch (err) {
    console.error("❌ updateProject error:", err);
    toast.error("Erreur lors de la mise à jour.");
    throw err;
  }
}

/**
 * 🗑️ Supprime un projet
 */
export async function deleteProject(id: string): Promise<void> {
  try {
    await http.delete(`/projects/${id}`);
    toast.success("🗑️ Projet supprimé");
  } catch (err) {
    console.error("❌ deleteProject error:", err);
    toast.error("Erreur lors de la suppression.");
    throw err;
  }
}

/* ============================================================================
 * Fonctions avancées
 * ========================================================================== */

/**
 * 📂 Duplique un projet
 */
export async function duplicateProject(id: string): Promise<Project | null> {
  try {
    const res = await http.post(`/projects/${id}/duplicate`);
    toast.success("📑 Projet dupliqué");
    return res.data;
  } catch (err) {
    console.error("❌ duplicateProject error:", err);
    toast.error("Erreur lors de la duplication.");
    return null;
  }
}

/**
 * 🚀 Publie un projet
 */
export async function publishProject(id: string): Promise<Project | null> {
  try {
    const res = await http.post(`/projects/${id}/publish`);
    toast.success("🚀 Projet publié");
    return res.data;
  } catch (err) {
    console.error("❌ publishProject error:", err);
    toast.error("Erreur lors de la publication.");
    return null;
  }
}

/**
 * 🔗 Partage un projet (génère un lien public)
 */
export async function shareProject(
  id: string
): Promise<{ url: string } | null> {
  try {
    const res = await http.post(`/projects/${id}/share`);
    toast.success("🔗 Lien de partage généré");
    return res.data;
  } catch (err) {
    console.error("❌ shareProject error:", err);
    toast.error("Erreur lors du partage.");
    return null;
  }
}
