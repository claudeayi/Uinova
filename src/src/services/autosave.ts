// src/services/autosave.ts
import { saveProject } from "./projects";
import { useAppStore } from "@/store/useAppStore";

let autosaveTimer: NodeJS.Timeout | null = null;
let lastSavedHash: string | null = null;
let autosaveQueue: (() => Promise<void>)[] = [];

const AUTOSAVE_DELAY = 2000; // 2s debounce
const MAX_RETRIES = 3;

/* ============================================================================
 * Utils
 * ========================================================================== */
function computeHash(obj: any): string {
  try {
    return JSON.stringify(obj);
  } catch {
    return "";
  }
}

function emitEvent(name: string, detail?: any) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

/* ============================================================================
 * Cancel autosave en attente
 * ========================================================================== */
export function cancelAutosave() {
  if (autosaveTimer) {
    clearTimeout(autosaveTimer);
    autosaveTimer = null;
  }
  autosaveQueue = [];
}

/* ============================================================================
 * Forcer une sauvegarde immédiate (sans debounce)
 * ========================================================================== */
export async function forceAutosave() {
  cancelAutosave();
  return await performAutosave();
}

/* ============================================================================
 * Déclenche l’autosave avec debounce
 * ========================================================================== */
export function triggerAutosave() {
  const { currentProjectId, getCurrentProject, autosaveEnabled } =
    useAppStore.getState();

  if (!currentProjectId || !autosaveEnabled) return;

  if (autosaveTimer) clearTimeout(autosaveTimer);

  autosaveTimer = setTimeout(() => {
    autosaveQueue.push(() => performAutosave());
    runQueue();
  }, AUTOSAVE_DELAY);
}

/* ============================================================================
 * Exécution de la file d’attente
 * ========================================================================== */
async function runQueue() {
  if (autosaveQueue.length === 0) return;

  const task = autosaveQueue.shift();
  if (task) {
    await task();
    if (autosaveQueue.length > 0) {
      await runQueue();
    }
  }
}

/* ============================================================================
 * Sauvegarde réelle avec retry et observabilité
 * ========================================================================== */
async function performAutosave() {
  const { currentProjectId, getCurrentProject } = useAppStore.getState();
  if (!currentProjectId) return;

  const project = getCurrentProject();
  if (!project) return;

  const currentHash = computeHash(project);
  if (currentHash === lastSavedHash) {
    console.info("⚡ Aucun changement depuis la dernière sauvegarde, skip.");
    return;
  }

  let attempt = 0;
  let success = false;
  const start = Date.now();

  useAppStore.setState({ autosaveStatus: "saving" });
  emitEvent("autosave:saving");

  while (attempt < MAX_RETRIES && !success) {
    try {
      attempt++;
      console.group(`💾 Autosave tentative ${attempt}`);

      await saveProject(currentProjectId, project);

      lastSavedHash = currentHash;
      success = true;

      const duration = Date.now() - start;
      const sizeKb = (currentHash.length / 1024).toFixed(1);

      console.log(
        `✅ Autosave réussi en ${duration}ms (taille: ${sizeKb} KB)`
      );
      useAppStore.setState({
        autosaveStatus: "success",
        lastSavedAt: new Date().toISOString(),
      });
      emitEvent("autosave:success", { duration, sizeKb });

      console.groupEnd();
    } catch (err) {
      console.error("❌ Autosave échoué:", err);
      if (attempt >= MAX_RETRIES) {
        useAppStore.setState({ autosaveStatus: "error" });
        emitEvent("autosave:error", { error: err });
        console.groupEnd();
        return;
      }
      const delay = attempt * 1000;
      console.warn(`⏳ Retry dans ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

/* ============================================================================
 * Protection avant fermeture onglet
 * ========================================================================== */
window.addEventListener("beforeunload", (e) => {
  const { autosaveStatus } = useAppStore.getState();
  if (autosaveStatus === "saving" || autosaveStatus === "error") {
    e.preventDefault();
    e.returnValue =
      "⚠️ Des changements récents n’ont peut-être pas été sauvegardés.";
  }
});
