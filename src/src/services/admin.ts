// src/services/admin.ts
import http from "./http";

/* -------------------------------------------------------------------------- */
/* 📊 Statistiques globales                                                    */
/* -------------------------------------------------------------------------- */
export interface AdminStats {
  users: number;
  projects: number;
  payments: number;
  emailTemplates: number;
  marketplaceItems?: number;
}

export async function getAdminStats(): Promise<AdminStats> {
  const res = await http.get("/admin/stats");
  return res.data.data || res.data;
}

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
  return res.data.data || res.data || [];
}

export async function updateUserRole(
  userId: string,
  role: "USER" | "PREMIUM" | "ADMIN"
): Promise<{ success: boolean; message?: string }> {
  const res = await http.put(`/admin/users/${userId}/role`, { role });
  return res.data;
}

/* -------------------------------------------------------------------------- */
/* 📦 Gestion des projets                                                      */
/* -------------------------------------------------------------------------- */
export interface AdminProject {
  id: string;
  name: string;
  owner: { id: string; email: string };
  createdAt: string;
  updatedAt?: string;
  status?: string;
}

export async function getAllProjects(params?: {
  search?: string;
  limit?: number;
}): Promise<AdminProject[]> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.limit) query.set("limit", String(params.limit));

  const res = await http.get(
    `/admin/projects${query.toString() ? `?${query.toString()}` : ""}`
  );
  return res.data.data || res.data || [];
}

export async function deleteProject(
  projectId: string
): Promise<{ success: boolean; message?: string }> {
  const res = await http.delete(`/admin/projects/${projectId}`);
  return res.data;
}

/* -------------------------------------------------------------------------- */
/* 🎬 Gestion des replays collaboratifs                                        */
/* -------------------------------------------------------------------------- */
export interface AdminReplay {
  id: string;
  projectId: string;
  dataUrl: string;
  createdAt: string;
  user?: { id: string; email: string };
}

export async function getAllReplays(params?: {
  limit?: number;
}): Promise<AdminReplay[]> {
  const query = params?.limit ? `?limit=${params.limit}` : "";
  const res = await http.get(`/admin/replays${query}`);
  return res.data.data || res.data || [];
}

export async function deleteReplay(
  replayId: string
): Promise<{ success: boolean; message?: string }> {
  const res = await http.delete(`/admin/replays/${replayId}`);
  return res.data;
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

export async function getAuditLogs(params?: {
  limit?: number;
  search?: string;
}): Promise<AuditLog[]> {
  const query = new URLSearchParams();
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.search) query.set("search", params.search);

  const res = await http.get(
    `/admin/logs${query.toString() ? `?${query.toString()}` : ""}`
  );
  return res.data.data || res.data || [];
}

/* -------------------------------------------------------------------------- */
/* 💳 Gestion des paiements                                                    */
/* -------------------------------------------------------------------------- */
export interface AdminPayment {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: "PENDING" | "SUCCEEDED" | "FAILED";
  createdAt: string;
}

export async function getAdminPayments(params?: {
  limit?: number;
}): Promise<AdminPayment[]> {
  const query = params?.limit ? `?limit=${params.limit}` : "";
  const res = await http.get(`/admin/payments${query}`);
  return res.data.data || res.data || [];
}

/* -------------------------------------------------------------------------- */
/* 🛒 Gestion de la marketplace                                                */
/* -------------------------------------------------------------------------- */
export interface AdminMarketplaceItem {
  id: string;
  title: string;
  type: "template" | "component";
  priceCents: number;
  currency: string;
  createdAt: string;
  owner?: { email: string };
}

export async function getAllMarketplaceItems(): Promise<AdminMarketplaceItem[]> {
  const res = await http.get("/admin/marketplace");
  return res.data.data || res.data || [];
}

export async function deleteMarketplaceItem(
  id: string
): Promise<{ success: boolean; message?: string }> {
  const res = await http.delete(`/admin/marketplace/${id}`);
  return res.data;
}
