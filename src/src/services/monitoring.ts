// src/services/monitoring.ts
import http from "./http";

/* ============================================================================
 * Typings
 * ========================================================================== */
export interface HealthReport {
  status: "ok" | "degraded" | "error";
  uptime: number; // en secondes
  db: "connected" | "disconnected";
  services?: Record<string, "up" | "down" | "degraded">;
  timestamp?: string;
}

export interface ParsedMetrics {
  [key: string]: number;
}

export interface LogEntry {
  id: string;
  createdAt: string;
  level: "info" | "warn" | "error";
  message: string;
  meta?: Record<string, any>;
}

export interface Alert {
  id: string;
  type: "cpu" | "memory" | "disk" | "custom";
  severity: "low" | "medium" | "high";
  message: string;
  createdAt: string;
  resolved?: boolean;
}

/* ============================================================================
 * Utils
 * ========================================================================== */

/**
 * Parse texte brut Prometheus → objet clé/valeur
 */
function parsePrometheusMetrics(text: string): ParsedMetrics {
  const metrics: ParsedMetrics = {};
  text.split("\n").forEach((line) => {
    if (!line || line.startsWith("#")) return;
    const [key, value] = line.split(/\s+/);
    const num = parseFloat(value);
    if (!isNaN(num)) metrics[key] = num;
  });
  return metrics;
}

/**
 * Format uptime (sec → h/m/s)
 */
export function formatUptime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return `${h}h ${m}m ${s}s`;
}

/* ============================================================================
 * API Monitoring
 * ========================================================================== */

/**
 * 📊 Récupère métriques Prometheus (brut + parsé)
 */
export async function getMetrics(): Promise<{ raw: string; parsed: ParsedMetrics }> {
  try {
    const res = await http.get("/monitoring/metrics", { responseType: "text" });
    const raw = typeof res.data === "string" ? res.data : JSON.stringify(res.data);
    return { raw, parsed: parsePrometheusMetrics(raw) };
  } catch (err) {
    console.error("❌ Erreur getMetrics:", err);
    return { raw: "", parsed: {} };
  }
}

/**
 * 🩺 Récupère un résumé santé système
 */
export async function getSystemHealth(): Promise<HealthReport | null> {
  try {
    const res = await http.get("/monitoring/health");
    return res.data;
  } catch (err) {
    console.error("❌ Erreur getSystemHealth:", err);
    return null;
  }
}

/**
 * 📝 Logs système (option admin)
 */
export async function getSystemLogs(limit = 50): Promise<LogEntry[]> {
  try {
    const res = await http.get("/monitoring/logs", { params: { limit } });
    return res.data.data || res.data;
  } catch (err) {
    console.error("❌ Erreur getSystemLogs:", err);
    return [];
  }
}

/**
 * 🚨 Alertes système
 */
export async function getAlerts(): Promise<Alert[]> {
  try {
    const res = await http.get("/monitoring/alerts");
    return res.data.data || res.data;
  } catch (err) {
    console.error("❌ Erreur getAlerts:", err);
    return [];
  }
}

/**
 * 📤 Exporter métriques (CSV local)
 */
export async function exportMetricsCSV(): Promise<void> {
  try {
    const { raw } = await getMetrics();
    const blob = new Blob([raw], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `metrics_${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error("❌ Erreur exportMetricsCSV:", err);
  }
}
