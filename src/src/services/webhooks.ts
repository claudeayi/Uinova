// src/services/webhooks.ts
import http from "./http";
import { toast } from "react-hot-toast";

/* ============================================================================
 * Interfaces
 * ========================================================================== */
export interface Webhook {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastTestResult?: "success" | "failed" | null;
  lastTriggeredAt?: string;
  failureCount?: number;
}

export interface WebhookLog {
  id: string;
  webhookId: string;
  timestamp: string;
  status: "success" | "failed";
  payload?: any;
  response?: any;
}

/* ============================================================================
 * Utils
 * ========================================================================== */
function handleError(err: any, context: string, userMsg: string) {
  console.error(`❌ [Webhook] ${context}:`, err);
  toast.error(userMsg);
  throw err;
}

/* ============================================================================
 * API Webhooks
 * ========================================================================== */

/**
 * 📋 Récupérer la liste des webhooks
 */
export async function listWebhooks(): Promise<Webhook[]> {
  try {
    const res = await http.get("/webhooks");
    return res.data.data || res.data;
  } catch (err) {
    return handleError(err, "listWebhooks", "Impossible de charger les webhooks.");
  }
}

/**
 * ➕ Créer un webhook
 */
export async function createWebhook(url: string, events: string[]): Promise<Webhook> {
  try {
    const res = await http.post("/webhooks", { url, events });
    toast.success("✅ Webhook créé");
    return res.data;
  } catch (err) {
    return handleError(err, "createWebhook", "Erreur lors de la création du webhook.");
  }
}

/**
 * ✏️ Mettre à jour un webhook
 */
export async function updateWebhook(
  id: string,
  payload: { url?: string; events?: string[]; active?: boolean }
): Promise<Webhook> {
  try {
    const res = await http.put(`/webhooks/${id}`, payload);
    toast.success("✏️ Webhook mis à jour");
    return res.data;
  } catch (err) {
    return handleError(err, "updateWebhook", "Erreur lors de la mise à jour.");
  }
}

/**
 * 🔄 Activer / désactiver un webhook
 */
export async function toggleWebhook(id: string, active: boolean): Promise<Webhook> {
  try {
    const res = await http.patch(`/webhooks/${id}/toggle`, { active });
    toast.success(active ? "🟢 Webhook activé" : "🔴 Webhook désactivé");
    return res.data;
  } catch (err) {
    return handleError(err, "toggleWebhook", "Impossible de changer l’état du webhook.");
  }
}

/**
 * 🧪 Tester un webhook (ping)
 */
export async function testWebhook(id: string): Promise<{ success: boolean; logId?: string }> {
  try {
    const res = await http.post(`/webhooks/${id}/test`);
    if (res.data.success) {
      toast.success("🧪 Test webhook réussi !");
    } else {
      toast.error("❌ Test webhook échoué.");
    }
    return res.data;
  } catch (err) {
    return handleError(err, "testWebhook", "Impossible de tester le webhook.");
  }
}

/**
 * 📜 Récupérer logs d’un webhook
 */
export async function getWebhookLogs(id: string): Promise<WebhookLog[]> {
  try {
    const res = await http.get(`/webhooks/${id}/logs`);
    return res.data.data || res.data;
  } catch (err) {
    return handleError(err, "getWebhookLogs", "Impossible de charger les logs.");
  }
}

/**
 * ⬇️ Télécharger logs d’un webhook
 */
export async function downloadWebhookLogs(id: string) {
  try {
    const res = await http.get(`/webhooks/${id}/logs/download`, {
      responseType: "blob",
    });
    const url = window.URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `webhook_${id}_logs.json`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("✅ Logs téléchargés");
  } catch (err) {
    handleError(err, "downloadWebhookLogs", "Impossible de télécharger les logs.");
  }
}

/**
 * 🗑️ Supprimer un webhook
 */
export async function deleteWebhook(id: string): Promise<void> {
  try {
    await http.delete(`/webhooks/${id}`);
    toast.success("🗑️ Webhook supprimé");
  } catch (err) {
    return handleError(err, "deleteWebhook", "Erreur lors de la suppression.");
  }
}
