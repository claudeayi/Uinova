import http from "./http";

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

export async function listEmailTemplates() {
  const res = await http.get("/email-templates");
  return res.data;
}

export async function updateEmailTemplate(id: string, payload: Partial<EmailTemplate>) {
  const res = await http.patch(`/email-templates/${id}`, payload);
  return res.data;
}

export async function createEmailTemplate(payload: Omit<EmailTemplate, "id">) {
  const res = await http.post("/email-templates", payload);
  return res.data;
}
