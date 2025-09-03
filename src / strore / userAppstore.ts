// src/store/useAppStore.ts
import { create } from "zustand";
import { socket } from "../socket";

/* ===============================
   Types
=============================== */
export type ElementData = {
  id: string;
  type: string;
  props: Record<string, any>;
  children?: ElementData[];
};

export type PageData = {
  id: string;
  name: string;
  elements: ElementData[];
  history: ElementData[][];
  future: ElementData[][];
};

export type ProjectData = {
  id: string;
  name: string;
  pages: PageData[];
  createdAt?: number;
  updatedAt?: number;
  lastSavedAt?: number;
};

/* ===============================
   AppState
=============================== */
interface AppState {
  projects: ProjectData[];
  currentProjectId: string | null;
  currentPageId: string | null;

  // Gestion projets/pages
  setProjects: (projects: ProjectData[]) => void;
  setCurrentProjectId: (id: string) => void;
  setCurrentPageId: (id: string) => void;
  addProject: (name: string) => void;
  deleteProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;
  addPage: (name: string) => void;
  deletePage: (id: string) => void;
  renamePage: (id: string, name: string) => void;
  duplicatePage: (id: string) => void;

  // Gestion éléments
  updateElements: (elements: ElementData[]) => void;
  saveSnapshot: () => void;
  undo: () => void;
  redo: () => void;

  // Autosave
  autosaveEnabled: boolean;
  markUnsaved: () => void;
  setAutosave: (enabled: boolean) => void;

  // Collaboration temps réel
  emitElements: (elements: ElementData[]) => void;
  listenElements: () => void;

  // Présence
  onlineUsers: number;
  setOnlineUsers: (count: number) => void;

  // Utilitaires
  getCurrentProject: () => ProjectData | null;
  getCurrentPage: () => PageData | null;
  getComponents: (pageId: string) => ElementData[];
  setComponents: (pageId: string, elements: ElementData[]) => void;

  // ⚙️ Préférences utilisateur
  preferences: {
    theme: "light" | "dark";
    language: "fr" | "en";
    notifications: { email: boolean; push: boolean };
    twoFA: boolean;
  };
  setTheme: (theme: "light" | "dark") => void;
  setLanguage: (lang: "fr" | "en") => void;
  toggleNotification: (type: "email" | "push", value: boolean) => void;
  toggleTwoFA: (value: boolean) => void;
}

/* ===============================
   Store Zustand
=============================== */
export const useAppStore = create<AppState>((set, get) => ({
  /* === State initial === */
  projects: [
    {
      id: "default",
      name: "Projet principal",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastSavedAt: Date.now(),
      pages: [
        {
          id: "home",
          name: "Page d'accueil",
          elements: [],
          history: [[]], // snapshot initial
          future: [],
        },
      ],
    },
  ],
  currentProjectId: "default",
  currentPageId: "home",

  /* === Gestion projets/pages === */
  setProjects: (projects) => set({ projects }),
  setCurrentProjectId: (id) => set({ currentProjectId: id }),
  setCurrentPageId: (id) => set({ currentPageId: id }),

  addProject: (name) => {
    const id = crypto.randomUUID();
    const newProject: ProjectData = {
      id,
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastSavedAt: Date.now(),
      pages: [
        {
          id: "home",
          name: "Page d'accueil",
          elements: [],
          history: [[]],
          future: [],
        },
      ],
    };
    set({
      projects: [...get().projects, newProject],
      currentProjectId: id,
      currentPageId: "home",
    });
  },

  deleteProject: (id) => {
    const { projects } = get();
    const filtered = projects.filter((p) => p.id !== id);
    set({
      projects: filtered,
      currentProjectId: filtered[0]?.id || null,
      currentPageId: filtered[0]?.pages[0]?.id || null,
    });
  },

  renameProject: (id, name) => {
    set({
      projects: get().projects.map((proj) =>
        proj.id === id ? { ...proj, name, updatedAt: Date.now() } : proj
      ),
    });
  },

  addPage: (name) => {
    const { projects, currentProjectId } = get();
    if (!currentProjectId) return;
    const id = crypto.randomUUID();
    set({
      projects: projects.map((proj) =>
        proj.id === currentProjectId
          ? {
              ...proj,
              updatedAt: Date.now(),
              pages: [
                ...proj.pages,
                { id, name, elements: [], history: [[]], future: [] },
              ],
            }
          : proj
      ),
      currentPageId: id,
    });
  },

  deletePage: (id) => {
    const { projects, currentProjectId } = get();
    if (!currentProjectId) return;
    set({
      projects: projects.map((proj) =>
        proj.id === currentProjectId
          ? { ...proj, pages: proj.pages.filter((p) => p.id !== id) }
          : proj
      ),
      currentPageId: get().getCurrentProject()?.pages[0]?.id || null,
    });
  },

  renamePage: (id, name) => {
    const { projects, currentProjectId } = get();
    if (!currentProjectId) return;
    set({
      projects: projects.map((proj) =>
        proj.id === currentProjectId
          ? {
              ...proj,
              pages: proj.pages.map((p) =>
                p.id === id ? { ...p, name } : p
              ),
            }
          : proj
      ),
    });
  },

  duplicatePage: (id) => {
    const { projects, currentProjectId } = get();
    if (!currentProjectId) return;
    const project = projects.find((p) => p.id === currentProjectId);
    const page = project?.pages.find((p) => p.id === id);
    if (!page) return;
    const newId = crypto.randomUUID();
    const clone: PageData = {
      ...page,
      id: newId,
      name: page.name + " (copie)",
      elements: JSON.parse(JSON.stringify(page.elements)),
      history: [[]],
      future: [],
    };
    set({
      projects: projects.map((proj) =>
        proj.id === currentProjectId
          ? { ...proj, pages: [...proj.pages, clone] }
          : proj
      ),
      currentPageId: newId,
    });
  },

  /* === Gestion des éléments === */
  updateElements: (elements) => {
    const { currentProjectId, currentPageId } = get();
    if (!currentProjectId || !currentPageId) return;
    set({
      projects: get().projects.map((proj) =>
        proj.id === currentProjectId
          ? {
              ...proj,
              updatedAt: Date.now(),
              pages: proj.pages.map((p) =>
                p.id === currentPageId ? { ...p, elements } : p
              ),
            }
          : proj
      ),
    });
    get().saveSnapshot(); // snapshot auto
  },

  saveSnapshot: () => {
    const { currentProjectId, currentPageId } = get();
    if (!currentProjectId || !currentPageId) return;
    set({
      projects: get().projects.map((proj) =>
        proj.id === currentProjectId
          ? {
              ...proj,
              updatedAt: Date.now(),
              pages: proj.pages.map((p) => {
                if (p.id !== currentPageId) return p;
                const last = p.history[p.history.length - 1];
                if (JSON.stringify(last) === JSON.stringify(p.elements)) {
                  return p; // évite doublons
                }
                return {
                  ...p,
                  history: [...p.history, p.elements],
                  future: [],
                };
              }),
            }
          : proj
      ),
    });
  },

  undo: () => {
    const { currentProjectId, currentPageId } = get();
    if (!currentProjectId || !currentPageId) return;
    set({
      projects: get().projects.map((proj) =>
        proj.id === currentProjectId
          ? {
              ...proj,
              pages: proj.pages.map((p) => {
                if (p.id !== currentPageId || p.history.length < 2) return p;
                const prevHistory = p.history.slice(0, -1);
                const lastSnapshot = prevHistory[prevHistory.length - 1];
                return {
                  ...p,
                  elements: lastSnapshot,
                  history: prevHistory,
                  future: [p.elements, ...p.future],
                };
              }),
            }
          : proj
      ),
    });
  },

  redo: () => {
    const { currentProjectId, currentPageId } = get();
    if (!currentProjectId || !currentPageId) return;
    set({
      projects: get().projects.map((proj) =>
        proj.id === currentProjectId
          ? {
              ...proj,
              pages: proj.pages.map((p) => {
                if (p.id !== currentPageId || p.future.length === 0) return p;
                const [next, ...rest] = p.future;
                return {
                  ...p,
                  elements: next,
                  history: [...p.history, next],
                  future: rest,
                };
              }),
            }
          : proj
      ),
    });
  },

  /* === Autosave === */
  autosaveEnabled: true,
  markUnsaved: () =>
    set({
      projects: get().projects.map((p) =>
        p.id === get().currentProjectId
          ? { ...p, updatedAt: Date.now() }
          : p
      ),
    }),
  setAutosave: (enabled) => set({ autosaveEnabled: enabled }),

  /* === Collaboration temps réel === */
  emitElements: (elements) => {
    const { currentProjectId, currentPageId } = get();
    if (!currentProjectId || !currentPageId) return;
    socket.emit("updateElements", { projectId: currentProjectId, pageId: currentPageId, elements });
    get().updateElements(elements);
  },

  listenElements: () => {
    socket.off("updateElements");
    socket.off("usersCount");
    socket.on("updateElements", (data: { projectId: string; pageId: string; elements: ElementData[] }) => {
      set({
        projects: get().projects.map((proj) =>
          proj.id === data.projectId
            ? {
                ...proj,
                pages: proj.pages.map((p) =>
                  p.id === data.pageId ? { ...p, elements: data.elements } : p
                ),
              }
            : proj
        ),
      });
    });
    socket.on("usersCount", (count: number) => set({ onlineUsers: count }));
  },

  /* === Présence === */
  onlineUsers: 1,
  setOnlineUsers: (count) => set({ onlineUsers: count }),

  /* === Utils === */
  getCurrentProject: () => {
    const { projects, currentProjectId } = get();
    return projects.find((p) => p.id === currentProjectId) || null;
  },

  getCurrentPage: () => {
    const { projects, currentProjectId, currentPageId } = get();
    return projects.find((p) => p.id === currentProjectId)?.pages.find((pg) => pg.id === currentPageId) || null;
  },

  getComponents: (pageId: string) => {
    const page = get().getCurrentProject()?.pages.find((p) => p.id === pageId);
    return page?.elements || [];
  },

  setComponents: (pageId: string, elements: ElementData[]) => {
    const { currentProjectId } = get();
    if (!currentProjectId) return;
    set({
      projects: get().projects.map((proj) =>
        proj.id === currentProjectId
          ? {
              ...proj,
              updatedAt: Date.now(),
              pages: proj.pages.map((p) =>
                p.id === pageId ? { ...p, elements } : p
              ),
            }
          : proj
      ),
    });
  },

  /* === Préférences globales === */
  preferences: {
    theme: (localStorage.getItem("theme") as "light" | "dark") || "light",
    language: (localStorage.getItem("lang") as "fr" | "en") || "fr",
    notifications: {
      email: localStorage.getItem("notif_email") === "true",
      push: localStorage.getItem("notif_push") === "true",
    },
    twoFA: localStorage.getItem("twoFA") === "true",
  },

  setTheme: (theme) => {
    localStorage.setItem("theme", theme);
    set((state) => ({ preferences: { ...state.preferences, theme } }));
  },

  setLanguage: (language) => {
    localStorage.setItem("lang", language);
    set((state) => ({ preferences: { ...state.preferences, language } }));
  },

  toggleNotification: (type, value) => {
    localStorage.setItem(`notif_${type}`, String(value));
    set((state) => ({
      preferences: {
        ...state.preferences,
        notifications: { ...state.preferences.notifications, [type]: value },
      },
    }));
  },

  toggleTwoFA: (value) => {
    localStorage.setItem("twoFA", String(value));
    set((state) => ({ preferences: { ...state.preferences, twoFA: value } }));
  },
}));
