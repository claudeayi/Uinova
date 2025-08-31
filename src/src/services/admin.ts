import http from "./http";

/* -------------------------------------------------------------------------- */
/* 👤 Gestion des utilisateurs                                                 */
/* -------------------------------------------------------------------------- */

export interface AdminUser {
  id: string;
  email: string;
  role: "USER" | "PREMIUM" | "ADMIN";
  createdAt: string;
}

export async function getUsers(): Promise<AdminUser[]> {
  const res = await http.get("/admin/users");
  return res.data || [];
}

export async function updateUserRole(userId: string, role: string) {
  const res = await http.put(`/admin/users/${userId}/role`, { role });
  return res.data; // { success:true }
}

/* -------------------------------------------------------------------------- */
/* 📦 Gestion des projets                                                      */
/* -------------------------------------------------------------------------- */

export interface AdminProject {
  id: string;
  name: string;
  owner: { id: string; email: string };
  createdAt: string;
}

export async function getAllProjects(params?: { search?: string; limit?: number }) {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.limit) query.set("limit", String(params.limit));

  const res = await http.get(`/admin/projects${query.toString() ? `?${query.toString()}` : ""}`);
  return res.data || [];
}

export async function deleteProject(projectId: string) {
  const res = await http.delete(`/admin/projects/${projectId}`);
  return res.data; // { success:true }
}

/* -------------------------------------------------------------------------- */
/* 🎬 Gestion des replays collaboratifs                                        */
/* -------------------------------------------------------------------------- */

export interface AdminReplay {
  id: string;
  projectId: string;
  dataUrl: string;
  createdAt: string;
}

export async function getAllReplays(params?: { limit?: number }) {
  const query = params?.limit ? `?limit=${params.limit}` : "";
  const res = await http.get(`/admin/replays${query}`);
  return res.data || [];
}

export async function deleteReplay(replayId: string) {
  const res = await http.delete(`/admin/replays/${replayId}`);
  return res.data; // { success:true }
}

/* -------------------------------------------------------------------------- */
/* 📜 Logs système / Audit                                                     */
/* -------------------------------------------------------------------------- */

export interface AuditLog {
  id: string;
  action: string;
  metadata?: Record<string, any>;
  createdAt: string;
  user?: { id: string; email: string };
}

export async function getAuditLogs(params?: { limit?: number; search?: string }) {
  const query = new URLSearchParams();
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.search) query.set("search", params.search);

  const res = await http.get(`/admin/logs${query.toString() ? `?${query.toString()}` : ""}`);
  return res.data || [];
}
