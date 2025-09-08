// src/services/deployments.ts
import http from "./http";

/* ============================================================================
 * Typings
 * ========================================================================== */
export type DeploymentStatus = "PENDING" | "RUNNING" | "SUCCESS" | "ERROR" | "CANCELED";

export interface Deployment {
  id: string;
  projectId: string;
  status: DeploymentStatus;
  url?: string;
  logs?: string;
  createdAt: string;
  updatedAt: string;
}

function emitEvent(name: string, detail?: any) {
  window.dispatchEvent(new CustomEvent(`deploy:${name}`, { detail }));
}

/* ============================================================================
 * API Déploiement
 * ========================================================================== */

/**
 * 🚀 Déployer un projet
 */
export async function deployProject(projectId: string): Promise<{ url?: string } | null> {
  try {
    const res = await http.post(`/infra/deploy`, { projectId });
    emitEvent("started", { projectId });
    return res.data;
  } catch (err) {
    console.error("❌ Erreur deployProject:", err);
    return null;
  }
}

/**
 * 📋 Liste des déploiements d’un projet
 */
export async function getDeployments(projectId: string): Promise<Deployment[]> {
  try {
    const res = await http.get(`/infra/deployments/${projectId}`);
    return res.data as Deployment[];
  } catch (err) {
    console.error("❌ Erreur getDeployments:", err);
    return [];
  }
}

/**
 * 📡 Statut d’un déploiement en cours
 */
export async function getDeploymentStatus(projectId: string): Promise<Deployment | null> {
  try {
    const res = await http.get(`/infra/deploy/${projectId}/status`);
    return res.data as Deployment;
  } catch (err) {
    console.error("❌ Erreur getDeploymentStatus:", err);
    return null;
  }
}

/**
 * 📜 Récupérer logs d’un déploiement
 */
export async function getDeploymentLogs(projectId: string): Promise<string | null> {
  try {
    const res = await http.get(`/infra/deploy/${projectId}/logs`, {
      responseType: "text",
    });
    return res.data;
  } catch (err) {
    console.error("❌ Erreur getDeploymentLogs:", err);
    return null;
  }
}

/**
 * ❌ Annuler un déploiement en cours
 */
export async function cancelDeployment(projectId: string): Promise<boolean> {
  try {
    await http.post(`/infra/deploy/${projectId}/cancel`);
    emitEvent("canceled", { projectId });
    return true;
  } catch (err) {
    console.error("❌ Erreur cancelDeployment:", err);
    return false;
  }
}

/**
 * 🔄 Relancer un déploiement
 */
export async function restartDeployment(projectId: string): Promise<boolean> {
  try {
    await http.post(`/infra/deploy/${projectId}/restart`);
    emitEvent("restarted", { projectId });
    return true;
  } catch (err) {
    console.error("❌ Erreur restartDeployment:", err);
    return false;
  }
}

/**
 * ↩️ Rollback vers un déploiement précédent
 */
export async function rollbackDeployment(
  projectId: string,
  deployId: string
): Promise<boolean> {
  try {
    await http.post(`/infra/deploy/${projectId}/rollback/${deployId}`);
    emitEvent("rollback", { projectId, deployId });
    return true;
  } catch (err) {
    console.error("❌ Erreur rollbackDeployment:", err);
    return false;
  }
}

/* ============================================================================
 * Helpers avancés
 * ========================================================================== */

/**
 * ⏱️ Suivi en temps réel d’un déploiement
 * Polling toutes les `intervalMs` ms
 */
export function watchDeploymentStatus(
  projectId: string,
  intervalMs = 5000,
  onUpdate?: (d: Deployment | null) => void
) {
  const interval = setInterval(async () => {
    const status = await getDeploymentStatus(projectId);
    if (onUpdate) onUpdate(status);
    emitEvent("status", { projectId, status });
    if (!status || ["SUCCESS", "ERROR", "CANCELED"].includes(status.status)) {
      clearInterval(interval);
    }
  }, intervalMs);
  return () => clearInterval(interval);
}

/**
 * 📥 Télécharger les logs en fichier .txt
 */
export async function downloadDeploymentLogs(projectId: string) {
  const logs = await getDeploymentLogs(projectId);
  if (!logs) return;

  const blob = new Blob([logs], { type: "text/plain" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `deploy_${projectId}_logs.txt`;
  a.click();
  window.URL.revokeObjectURL(url);
}
