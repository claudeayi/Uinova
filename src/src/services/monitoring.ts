import http from "./http";

// Récupère métriques Prometheus
export async function getMetrics() {
  const res = await http.get("/monitoring/metrics");
  return res.data; // texte brut Prometheus
}

// Récupère un résumé santé système
export async function getSystemHealth() {
  const res = await http.get("/monitoring/health");
  return res.data; // { status: "ok", uptime: ..., db: "connected" }
}
