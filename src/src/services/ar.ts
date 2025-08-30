import http from "./http";

// Récupère la scène 3D générée pour un projet
export async function getARScene(projectId: string) {
  const res = await http.get(`/ar/${projectId}/scene`);
  return res.data; // JSON Three.js Scene
}
