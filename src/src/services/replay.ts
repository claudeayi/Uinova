import http from "./http";

// Récupère les métadonnées du replay
export async function getReplayMeta(projectId: string) {
  const res = await http.get(`/replay/${projectId}/meta`);
  return res.data; // { steps: [...], duration }
}

// Télécharge la vidéo du replay
export function getReplayVideoUrl(projectId: string) {
  return `/api/replay/${projectId}/video`; // utilisé directement dans <video src=...>
}
