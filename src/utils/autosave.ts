// src/utils/autosave.ts
import type { ElementData } from "../store/useAppStore";

const KEY = "uinova.autosave.v1";

type DraftMap = Record<string, ElementData[]>;

function keyOf(projectId: string, pageId: string) {
  return `${projectId}::${pageId}`;
}

export function saveDraft(projectId: string, pageId: string, elements: ElementData[]) {
  try {
    const raw = localStorage.getItem(KEY);
    const map: DraftMap = raw ? JSON.parse(raw) : {};
    map[keyOf(projectId, pageId)] = elements;
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {}
}

export function loadDraft(projectId: string, pageId: string): ElementData[] | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const map: DraftMap = JSON.parse(raw);
    return map[keyOf(projectId, pageId)] || null;
  } catch {
    return null;
  }
}

export function clearDraft(projectId: string, pageId: string) {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const map: DraftMap = JSON.parse(raw);
    delete map[keyOf(projectId, pageId)];
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {}
}
