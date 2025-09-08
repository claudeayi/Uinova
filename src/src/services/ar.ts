// src/services/ar.ts
import http from "./http";
import toast from "react-hot-toast";

/* ============================================================================
 *  Types AR / Three.js
 * ========================================================================== */
export interface ARScene {
  metadata: { version: number; type: string; generator?: string };
  object: {
    uuid: string;
    type: string;
    children?: any[];
  };
  materials?: any[];
  textures?: any[];
}

/* ============================================================================
 *  Utils
 * ========================================================================== */
function validateARScene(scene: any): scene is ARScene {
  return (
    scene &&
    typeof scene === "object" &&
    scene.metadata?.type === "Object" &&
    typeof scene.object?.uuid === "string"
  );
}

function cacheKey(projectId: string) {
  return `uinova_ar_scene_${projectId}`;
}

/* ============================================================================
 *  API Methods
 * ========================================================================== */

// ✅ Charger une scène AR
export async function getARScene(
  projectId: string,
  { useCache = true, signal }: { useCache?: boolean; signal?: AbortSignal } = {}
): Promise<ARScene | null> {
  const key = cacheKey(projectId);

  // Vérifier cache
  if (useCache) {
    const cached = localStorage.getItem(key);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (validateARScene(parsed)) {
          console.info("📦 Chargé depuis cache local ARScene:", projectId);
          return parsed;
        }
      } catch {
        /* ignore parse errors */
      }
    }
  }

  // API call avec retry
  let attempt = 0;
  while (attempt < 3) {
    try {
      const res = await http.get(`/ar/${projectId}/scene`, { signal });
      if (!validateARScene(res.data)) throw new Error("Format de scène invalide");

      localStorage.setItem(key, JSON.stringify(res.data));
      return res.data;
    } catch (err: any) {
      attempt++;
      console.error(`❌ getARScene [tentative ${attempt}]`, err);

      if (attempt >= 3) {
        toast.error("Impossible de charger la scène AR après plusieurs tentatives.");
        return null;
      }

      await new Promise((r) => setTimeout(r, attempt * 1000)); // backoff
    }
  }
  return null;
}

// ✅ Sauvegarder une scène AR
export async function saveARScene(projectId: string, scene: ARScene) {
  try {
    if (!validateARScene(scene)) throw new Error("❌ Scène invalide");
    const res = await http.put(`/ar/${projectId}/scene`, scene);
    localStorage.setItem(cacheKey(projectId), JSON.stringify(scene));
    toast.success("✅ Scène AR sauvegardée");
    return res.data;
  } catch (err) {
    console.error("❌ saveARScene error:", err);
    toast.error("Erreur lors de la sauvegarde de la scène AR");
    throw err;
  }
}

// ✅ Supprimer une scène AR
export async function deleteARScene(projectId: string) {
  try {
    await http.delete(`/ar/${projectId}/scene`);
    localStorage.removeItem(cacheKey(projectId));
    toast.success("🗑️ Scène AR supprimée");
    return true;
  } catch (err) {
    console.error("❌ deleteARScene error:", err);
    toast.error("Erreur suppression scène AR");
    return false;
  }
}
