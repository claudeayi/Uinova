// src/services/replay.ts
import http from "./http";
import { toast } from "react-hot-toast";

/* ============================================================================
 * Types
 * ========================================================================== */
export interface ReplayMeta {
  id: string;
  projectId: string;
  steps: { t: number; action: string; payload?: any }[];
  duration: number; // en secondes
  type: "video" | "session";
  createdAt: string;
}

export interface Replay {
  id: string;
  projectId: string;
  user?: { id: string; email: string };
  createdAt: string;
  type: "video" | "session";
  dataUrl?: string;
  meta?: ReplayMeta;
  events?: { t: number; action: string; payload: any }[];
}

/* ============================================================================
 * Utils
 * ========================================================================== */
function handleError(err: any, context: string, userMsg: string) {
  console.error(`❌ [Replay] ${context}:`, err);
  toast.error(userMsg);
  throw err;
}

/* ============================================================================
 * API Replay
 * ========================================================================== */

/**
 * 📊 Récupère les métadonnées du replay
 */
export async function getReplayMeta(projectId: string): Promise<ReplayMeta | null> {
  try {
    const res = await http.get(`/replay/${projectId}/meta`);
    return res.data;
  } catch (err) {
    return handleError(err, "getReplayMeta", "Impossible de charger les métadonnées du replay.");
  }
}

/**
 * 🎬 Liste tous les replays d’un projet
 */
export async function getReplays(
  projectId: string,
  page = 1,
  limit = 10
): Promise<{ data: Replay[]; pagination: { page: number; total: number } }> {
  try {
    const res = await http.get(`/replay/${projectId}`, {
      params: { page, limit },
    });
    return res.data;
  } catch (err) {
    return handleError(err, "getReplays", "Impossible de charger les replays.");
  }
}

/**
 * 🗑️ Supprime un replay
 */
export async function deleteReplay(projectId: string, replayId: string): Promise<boolean> {
  try {
    await http.delete(`/replay/${projectId}/${replayId}`);
    toast.success("🗑️ Replay supprimé");
    return true;
  } catch (err) {
    handleError(err, "deleteReplay", "Erreur lors de la suppression du replay.");
    return false;
  }
}

/**
 * 🔗 Récupère l’URL vidéo d’un replay
 */
export function getReplayVideoUrl(projectId: string, replayId?: string) {
  return replayId
    ? `/api/replay/${projectId}/video/${replayId}`
    : `/api/replay/${projectId}/video`;
}

/**
 * ⬇️ Télécharge un replay (fichier .json ou .mp4)
 */
export async function downloadReplay(
  projectId: string,
  replayId: string,
  format: "json" | "mp4" = "json"
) {
  try {
    const res = await http.get(`/replay/${projectId}/download/${replayId}`, {
      params: { format },
      responseType: "blob",
    });

    const filename = `replay_${replayId}.${format}`;
    const url = window.URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success(`✅ Replay téléchargé (${filename})`);
  } catch (err) {
    handleError(err, "downloadReplay", "Impossible de télécharger le replay.");
  }
}

/**
 * 🧪 Teste la validité d’un replay
 */
export async function validateReplay(projectId: string, replayId: string): Promise<boolean> {
  try {
    const res = await http.get(`/replay/${projectId}/validate/${replayId}`);
    return res.data.valid;
  } catch (err) {
    handleError(err, "validateReplay", "Impossible de valider le replay.");
    return false;
  }
}
