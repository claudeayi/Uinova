import http from "./http";

/**
 * ⚡ Chat IA (conversationnel)
 * @param prompt - Texte saisi par l’utilisateur
 * @param history - Historique des messages [{ role: "user"|"assistant", content: string }]
 */
export async function askAI(prompt: string, history: any[] = []) {
  const res = await http.post("/ai/chat", { prompt, history });
  return res.data.answer; // { answer: string }
}

/**
 * ⚡ Génération de projet complet (React, Flutter, HTML, PWA)
 * @param prompt - Description du projet
 * @param framework - Cible: react | flutter | html | pwa
 */
export async function generateProject(prompt: string, framework: string) {
  const res = await http.post("/ai/generate", { prompt, framework });
  return res.data; // { id, name, pages: [...] }
}

/**
 * ⚡ Génération de page spécifique dans un projet
 * @param projectId - Id projet
 * @param prompt - Description de la page
 */
export async function generatePage(projectId: string, prompt: string) {
  const res = await http.post(`/ai/projects/${projectId}/generate-page`, { prompt });
  return res.data; // { id, name, schemaJSON }
}

/**
 * ⚡ Suggestion UI (ex: "Ajoute un bouton call-to-action en bas de la page")
 * @param projectId - Id projet
 * @param pageId - Id page
 * @param prompt - Description
 */
export async function suggestUI(projectId: string, pageId: string, prompt: string) {
  const res = await http.post(`/ai/projects/${projectId}/pages/${pageId}/suggest`, { prompt });
  return res.data; // { ops: [...], preview: schemaJSON }
}
