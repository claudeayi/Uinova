// src/services/admin.ts
import http from "./http";
import { toast } from "react-hot-toast";

/* ============================================================================
 * Utils
 * ========================================================================== */
function handleError(err: any, context: string, userMsg: string) {
  console.error(`❌ [Admin] ${context}:`, err);
  toast.error(userMsg);
  throw err;
}

function downloadFile(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

/* ============================================================================
 * 📊 Statistiques globales
 * ========================================================================== */
export interface AdminStats {
  users: number;
  projects: number;
  payments: number;
  emailTemplates: number;
  marketplaceItems?: number;
  activeUsers?: number;
}

export async function getAdminStats(): Promise<AdminStats> {
  try {
    const res = await http.get("/admin/stats");
    return res.data.data || res.data;
  } catch (err) {
    return handleError(err, "getAdminStats", "Impossible de charger les statistiques.");
  }
}

/* ============================================================================
 * 👤 Gestion des utilisateurs
 * ========================================================================== */
export interface AdminUser {
  id: string;
  email: string;
  role: "USER" | "PREMIUM" | "ADMIN";
  createdAt: string;
  lastLoginAt?: string;
  isActive?: boolean;
}

export async function getUsers(): Promise<AdminUser[]> {
  try {
    const res = await http.get("/admin/users");
    return res.data.data || res.data || [];
  } catch (err) {
    return handleError(err, "getUsers", "Impossible de charger les utilisateurs.");
  }
}

export async function updateUserRole(
  userId: string,
  role: "USER" | "PREMIUM" | "ADMIN"
): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await http.put(`/admin/users/${userId}/role`, { role });
    toast.success("✅ Rôle utilisateur mis à jour");
    return res.data;
  } catch (err) {
    return handleError(err, "updateUserRole", "Erreur mise à jour rôle.");
  }
}

export async function toggleUserStatus(
  userId: string,
  active: boolean
): Promise<{ success: boolean }> {
  try {
    const res = await http.patch(`/admin/users/${userId}/status`, { active });
    toast.success(active ? "🟢 Utilisateur activé" : "🔴 Utilisateur désactivé");
    return res.data;
  } catch (err) {
    return handleError(err, "toggleUserStatus", "Erreur changement état utilisateur.");
  }
}

/* ============================================================================
 * 📦 Gestion des projets
 * ========================================================================== */
export interface AdminProject {
  id: string;
  name: string;
  owner: { id: string; email: string };
  createdAt: string;
  updatedAt?: string;
  status?: "draft" | "published" | "archived";
  pagesCount?: number;
}

export async function getAllProjects(params?: {
  search?: string;
  limit?: number;
}): Promise<AdminProject[]> {
  try {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.limit) query.set("limit", String(params.limit));

    const res = await http.get(
      `/admin/projects${query.toString() ? `?${query.toString()}` : ""}`
    );
    return res.data.data || res.data || [];
  } catch (err) {
    return handleError(err, "getAllProjects", "Impossible de charger les projets.");
  }
}

export async function deleteProject(
  projectId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await http.delete(`/admin/projects/${projectId}`);
    toast.success("🗑️ Projet supprimé");
    return res.data;
  } catch (err) {
    return handleError(err, "deleteProject", "Erreur suppression projet.");
  }
}

/* ============================================================================
 * 🎬 Gestion des replays collaboratifs
 * ========================================================================== */
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
  try {
    const query = params?.limit ? `?limit=${params.limit}` : "";
    const res = await http.get(`/admin/replays${query}`);
    return res.data.data || res.data || [];
  } catch (err) {
    return handleError(err, "getAllReplays", "Impossible de charger les replays.");
  }
}

export async function deleteReplay(
  replayId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await http.delete(`/admin/replays/${replayId}`);
    toast.success("🗑️ Replay supprimé");
    return res.data;
  } catch (err) {
    return handleError(err, "deleteReplay", "Erreur suppression replay.");
  }
}

/* ============================================================================
 * 📜 Logs système / Audit
 * ========================================================================== */
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
  try {
    const query = new URLSearchParams();
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.search) query.set("search", params.search);

    const res = await http.get(
      `/admin/logs${query.toString() ? `?${query.toString()}` : ""}`
    );
    return res.data.data || res.data || [];
  } catch (err) {
    return handleError(err, "getAuditLogs", "Impossible de charger les logs.");
  }
}

export async function exportAuditLogsCSV(logs: AuditLog[]) {
  const header = "ID,Action,Date,Utilisateur\n";
  const rows = logs
    .map(
      (l) =>
        `${l.id},${l.action},${new Date(l.createdAt).toISOString()},${
          l.user?.email || "-"
        }`
    )
    .join("\n");

  const blob = new Blob([header + rows], { type: "text/csv" });
  downloadFile(blob, "audit_logs.csv");
}

/* ============================================================================
 * 💳 Gestion des paiements
 * ========================================================================== */
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
  try {
    const query = params?.limit ? `?limit=${params.limit}` : "";
    const res = await http.get(`/admin/payments${query}`);
    return res.data.data || res.data || [];
  } catch (err) {
    return handleError(err, "getAdminPayments", "Impossible de charger les paiements.");
  }
}

/* ============================================================================
 * 🛒 Gestion de la marketplace
 * ========================================================================== */
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
  try {
    const res = await http.get("/admin/marketplace");
    return res.data.data || res.data || [];
  } catch (err) {
    return handleError(err, "getAllMarketplaceItems", "Impossible de charger la marketplace.");
  }
}

export async function deleteMarketplaceItem(
  id: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await http.delete(`/admin/marketplace/${id}`);
    toast.success("🗑️ Item supprimé");
    return res.data;
  } catch (err) {
    return handleError(err, "deleteMarketplaceItem", "Erreur suppression item.");
  }
}
