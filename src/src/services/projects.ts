import http from "./http";

/**
 * 📂 Récupère la liste des projets
 */
export async function getProjects() {
  const res = await http.get("/projects");
  return res.data; // [{id, name, status, updatedAt, ...}]
}

/**
 * 📂 Récupère un projet spécifique par ID
 */
export async function getProjectById(id: string) {
  const res = await http.get(`/projects/${id}`);
  return res.data; // {id, name, status, pages, ...}
}

/**
 * ➕ Crée un nouveau projet
 */
export async function createProject(data: {
  name: string;
  tagline?: string;
  icon?: string;
  status?: string;
}) {
  const res = await http.post("/projects", data);
  return res.data; // {id, name, ...}
}

/**
 * ✏️ Met à jour un projet existant
 */
export async function updateProject(id: string, data: any) {
  const res = await http.put(`/projects/${id}`, data);
  return res.data; // {id, name, ...}
}

/**
 * 🗑️ Supprime un projet
 */
export async function deleteProject(id: string) {
  const res = await http.delete(`/projects/${id}`);
  return res.data; // {success: true}
}
