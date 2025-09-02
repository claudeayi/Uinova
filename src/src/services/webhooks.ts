import http from "./http";

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastTestResult?: "success" | "failed" | null;
}

/**
 * 📋 Récupérer la liste des webhooks
 */
export async function listWebhooks(): Promise<Webhook[]> {
  const res = await http.get("/webhooks");
  return res.data.data || res.data;
}

/**
 * ➕ Créer un webhook
 */
export async function createWebhook(url: string, events: string[]): Promise<Webhook> {
  const res = await http.post("/webhooks", { url, events });
  return res.data;
}

/**
 * ✏️ Mettre à jour un webhook
 */
export async function updateWebhook(
  id: string,
  payload: { url?: string; events?: string[]; active?: boolean }
): Promise<Webhook> {
  const res = await http.put(`/webhooks/${id}`, payload);
  return res.data;
}

/**
 * 🧪 Tester un webhook (ping)
 */
export async function testWebhook(id: string): Promise<{ success: boolean }> {
  const res = await http.post(`/webhooks/${id}/test`);
  return res.data;
}

/**
 * 🗑️ Supprimer un webhook
 */
export async function deleteWebhook(id: string): Promise<void> {
  await http.delete(`/webhooks/${id}`);
}
