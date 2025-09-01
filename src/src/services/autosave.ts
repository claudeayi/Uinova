import { saveProject } from "./projects";
import { useAppStore } from "@/store/useAppStore";

let autosaveTimer: NodeJS.Timeout | null = null;

/**
 * Sauvegarde automatique avec debounce
 */
export function triggerAutosave() {
  const { currentProjectId, getCurrentProject, autosaveEnabled } = useAppStore.getState();
  if (!currentProjectId || !autosaveEnabled) return;

  if (autosaveTimer) clearTimeout(autosaveTimer);

  autosaveTimer = setTimeout(async () => {
    try {
      const project = getCurrentProject();
      if (!project) return;
      await saveProject(currentProjectId, project);
      console.log("💾 Autosave OK", new Date().toISOString());
    } catch (err) {
      console.error("❌ Autosave failed:", err);
    }
  }, 2000); // délai 2s
}
