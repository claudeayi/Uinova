import http from "./http";

/**
 * 👤 Gestion des utilisateurs
 */
export async function getUsers() {
  const res = await http.get("/admin/users");
  return res.data; // [{id,email,role,createdAt}, ...]
}

export async function updateUserRole(userId: string, role: string) {
  const res = await http.put(`/admin/users/${userId}/role`, { role });
  return res.data; // { success:true }
}

/**
 * 📦 Gestion des projets
 */
export async function getAllProjects() {
  const res = await http.get("/admin/projects");
  return res.data; // [{id,name,owner:{id,email}}, ...]
}

export async function deleteProject(projectId: string) {
  const res = await http.delete(`/admin/projects/${projectId}`);
  return res.data; // { success:true }
}

/**
 * 🎬 Gestion des replays
 */
export async function getAllReplays() {
  const res = await http.get("/admin/replays");
  return res.data; // [{id,projectId,dataUrl,createdAt}, ...]
}

export async function deleteReplay(replayId: string) {
  const res = await http.delete(`/admin/replays/${replayId}`);
  return res.data; // { success:true }
}

/**
 * 📜 Logs système
 */
export async function getAuditLogs(limit = 50) {
  const res = await http.get(`/admin/logs?limit=${limit}`);
  return res.data; // [{id,action,metadata,createdAt,user:{id,email}}, ...]
}
