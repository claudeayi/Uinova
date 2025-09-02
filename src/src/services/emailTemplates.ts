import http from "./http";

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 📋 Lister tous les templates email
 */
export async function listEmailTemplates(): Promise<EmailTemplate[]> {
  const res = await http.get("/email-templates");
  return res.data.data || res.data;
}

/**
 * ➕ Créer un template email
 */
export async function createEmailTemplate(payload: {
  name: string;
  subject: string;
  body: string;
}): Promise<EmailTemplate> {
  const res = await http.post("/email-templates", payload);
  return res.data;
}

/**
 * ✏️ Mettre à jour un template email
 */
export async function updateEmailTemplate(
  id: string,
  payload: { name?: string; subject?: string; body?: string }
): Promise<EmailTemplate> {
  const res = await http.put(`/email-templates/${id}`, payload);
  return res.data;
}

/**
 * 🧪 Envoyer un test d’email
 */
export async function sendTestEmail(
  id: string,
  email: string
): Promise<{ success: boolean }> {
  const res = await http.post(`/email-templates/${id}/test`, { email });
  return res.data;
}

/**
 * 🗑️ Supprimer un template email
 */
export async function deleteEmailTemplate(id: string): Promise<void> {
  await http.delete(`/email-templates/${id}`);
}
