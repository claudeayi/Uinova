import http from "./http";

/**
 * ⚡ Chat IA (conversationnel)
 * @param prompt - Texte saisi par l’utilisateur
 * @param history - Historique des messages [{ role: "user"|"assistant", content: string }]
 */
export async function askAI(prompt: string, history: any[] = []) {
  try {
    const res = await http.post("/ai/chat", { prompt, history });
    return res.data.answer; // { answer: string }
  } catch (err: any) {
    console.error("❌ askAI error:", err.response?.data || err.message);
    throw new Error(err.response?.data?.message || "Erreur IA (chat)");
  }
}

/**
 * ⚡ Génération de projet complet (React, Flutter, HTML, PWA)
 * @param prompt - Description du projet
 * @param framework - Cible: react | flutter | html | pwa
 */
export async function generateProject(prompt: string, framework: "react" | "flutter" | "html" | "pwa") {
  try {
    const res = await http.post("/ai/generate", { prompt, framework });
    return res.data; // { id, name, pages: [...] }
  } catch (err: any) {
    console.error("❌ generateProject error:", err.response?.data || err.message);
    throw new Error(err.response?.data?.message || "Erreur IA (projet)");
  }
}

/**
 * ⚡ Génération de page spécifique dans un projet
 * @param projectId - Id projet
 * @param prompt - Description de la page
 */
export async function generatePage(projectId: string, prompt: string) {
  try {
    const res = await http.post(`/ai/projects/${projectId}/generate-page`, { prompt });
    return res.data; // { id, name, schemaJSON }
  } catch (err: any) {
    console.error("❌ generatePage error:", err.response?.data || err.message);
    throw new Error(err.response?.data?.message || "Erreur IA (page)");
  }
}

/**
 * ⚡ Suggestion UI (ex: "Ajoute un bouton call-to-action en bas de la page")
 * @param projectId - Id projet
 * @param pageId - Id page
 * @param prompt - Description
 */
export async function suggestUI(projectId: string, pageId: string, prompt: string) {
  try {
    const res = await http.post(`/ai/projects/${projectId}/pages/${pageId}/suggest`, { prompt });
    return res.data; // { ops: [...], preview: schemaJSON }
  } catch (err: any) {
    console.error("❌ suggestUI error:", err.response?.data || err.message);
    throw new Error(err.response?.data?.message || "Erreur IA (UI)");
  }
}

/**
 * ⚡ Génération de code backend/infra
 * @param prompt - Description du code attendu
 * @param language - Langage cible (ex: typescript, python, java…)
 */
export async function generateCode(prompt: string, language: string = "typescript") {
  try {
    const res = await http.post("/ai/generate-code", { prompt, language });
    return res.data; // { code, files? }
  } catch (err: any) {
    console.error("❌ generateCode error:", err.response?.data || err.message);
    throw new Error(err.response?.data?.message || "Erreur IA (code)");
  }
}

/**
 * ⚡ Génération d’UI ciblée (React, Flutter, HTML)
 * @param prompt - Description UI
 * @param framework - react | flutter | html
 */
export async function generateUI(prompt: string, framework: "react" | "flutter" | "html" = "react") {
  try {
    const res = await http.post("/ai/generate-ui", { prompt, framework });
    return res.data; // { code, previewUrl? }
  } catch (err: any) {
    console.error("❌ generateUI error:", err.response?.data || err.message);
    throw new Error(err.response?.data?.message || "Erreur IA (UI)");
  }
}
