import http from "./http";

// Déploie un projet et renvoie l’URL
export async function deployProject(projectId: string) {
  const res = await http.post(`/infra/deploy`, { projectId });
  return res.data; // { url: "https://monprojet.uinova.app" }
}

// Récupère la liste des déploiements d’un projet
export async function getDeployments(projectId: string) {
  const res = await http.get(`/infra/deployments/${projectId}`);
  return res.data;
}
