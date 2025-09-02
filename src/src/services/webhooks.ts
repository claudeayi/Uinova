import http from "./http";

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  active: boolean;
}

export async function listWebhooks() {
  const res = await http.get("/webhooks");
  return res.data;
}

export async function createWebhook(url: string, events: string[]) {
  const res = await http.post("/webhooks", { url, events });
  return res.data;
}

export async function testWebhook(id: string) {
  const res = await http.post(`/webhooks/${id}/test`);
  return res.data;
}

export async function deleteWebhook(id: string) {
  const res = await http.delete(`/webhooks/${id}`);
  return res.data;
}
