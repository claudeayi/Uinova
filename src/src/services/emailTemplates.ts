// src/services/emailTemplates.ts
import http from "./http";

/* ============================================================================
 * Typings
 * ========================================================================== */
export type TemplateStatus = "draft" | "published";

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  status?: TemplateStatus;
  createdAt?: string;
  updatedAt?: string;
}

function emitEvent(name: string, detail?: any) {
  window.dispatchEvent(new CustomEvent(`email-template:${name}`, { detail }));
}

/* ============================================================================
 * API – CRUD de base
 * ========================================================================== */

/**
 * 📋 Lister tous les templates email
 */
export async function listEmailTemplates(): Promise<EmailTemplate[]> {
  try {
    const res = await http.get("/email-templates");
    return res.data.data || res.data;
  } catch (err) {
    console.error("❌ Erreur listEmailTemplates:", err);
    return [];
  }
}

/**
 * ➕ Créer un template email
 */
export async function createEmailTemplate(payload: {
  name: string;
  subject: string;
  body: string;
  status?: TemplateStatus;
}): Promise<EmailTemplate | null> {
  try {
    const res = await http.post("/email-templates", payload);
    emitEvent("created", res.data);
    return res.data;
  } catch (err) {
    console.error("❌ Erreur createEmailTemplate:", err);
    return null;
  }
}

/**
 * ✏️ Mettre à jour un template email
 */
export async function updateEmailTemplate(
  id: string,
  payload: Partial<Omit<EmailTemplate, "id">>
): Promise<EmailTemplate | null> {
  try {
    const res = await http.put(`/email-templates/${id}`, payload);
    emitEvent("updated", res.data);
    return res.data;
  } catch (err) {
    console.error("❌ Erreur updateEmailTemplate:", err);
    return null;
  }
}

/**
 * 🧪 Envoyer un test d’email
 */
export async function sendTestEmail(
  id: string,
  email: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await http.post(`/email-templates/${id}/test`, { email });
    return res.data;
  } catch (err: any) {
    console.error("❌ Erreur sendTestEmail:", err);
    return { success: false, error: err.message };
  }
}

/**
 * 🗑️ Supprimer un template email
 */
export async function deleteEmailTemplate(id: string): Promise<boolean> {
  try {
    await http.delete(`/email-templates/${id}`);
    emitEvent("deleted", id);
    return true;
  } catch (err) {
    console.error("❌ Erreur deleteEmailTemplate:", err);
    return false;
  }
}

/* ============================================================================
 * Helpers avancés
 * ========================================================================== */

/**
 * 📑 Dupliquer un template
 */
export async function duplicateEmailTemplate(
  id: string,
  overrides?: Partial<Omit<EmailTemplate, "id">>
): Promise<EmailTemplate | null> {
  try {
    const template = await http.get(`/email-templates/${id}`);
    const copyPayload = {
      ...template.data,
      name: (template.data.name || "Sans titre") + " (copie)",
      ...overrides,
    };
    return await createEmailTemplate(copyPayload);
  } catch (err) {
    console.error("❌ Erreur duplicateEmailTemplate:", err);
    return null;
  }
}

/**
 * 👀 Prévisualiser un template
 */
export async function previewEmailTemplate(id: string): Promise<string | null> {
  try {
    const res = await http.get(`/email-templates/${id}/preview`, {
      responseType: "text",
    });
    return res.data;
  } catch (err) {
    console.error("❌ Erreur previewEmailTemplate:", err);
    return null;
  }
}

/**
 * 📤 Exporter un template en JSON
 */
export async function exportTemplateJson(id: string): Promise<void> {
  try {
    const res = await http.get(`/email-templates/${id}`);
    const blob = new Blob([JSON.stringify(res.data, null, 2)], {
      type: "application/json",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `template_${id}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error("❌ Erreur exportTemplateJson:", err);
  }
}

/**
 * 📥 Importer un template JSON
 */
export async function importTemplateJson(file: File): Promise<EmailTemplate | null> {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    return await createEmailTemplate(parsed);
  } catch (err) {
    console.error("❌ Erreur importTemplateJson:", err);
    return null;
  }
}
