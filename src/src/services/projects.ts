import http from "./http";

// Récupère la liste des projets
export async function getProjects() {
  const res = await http.get("/projects");
  return res.data; // [{id, name, ...}]
}
