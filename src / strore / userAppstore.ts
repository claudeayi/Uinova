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
};

interface AppState {
  projects: ProjectData[];
  currentProjectId: string | null;
  currentPageId: string | null;

  // Gestion projets/pages
  setProjects: (projects: ProjectData[]) => void;
  setCurrentProjectId: (id: string) => void;
  setCurrentPageId: (id: string) => void;
  addProject: (name: string) => void;
  addPage: (name: string) => void;

  // Gestion éléments
  updateElements: (elements: ElementData[]) => void;
  saveSnapshot: () => void;
  undo: () => void;
  redo: () => void;

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

  addPage: (name) => {
    const { projects, currentProjectId } = get();
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

  /* === Gestion des éléments === */
  updateElements: (elements) => {
    const { projects, currentProjectId, currentPageId } = get();
    if (!currentProjectId || !currentPageId) return;

    set({
      projects: projects.map((proj) =>
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
  },

  saveSnapshot: () => {
    const { projects, currentProjectId, currentPageId } = get();
    if (!currentProjectId || !currentPageId) return;

    set({
      projects: projects.map((proj) =>
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
    const { projects, currentProjectId, currentPageId } = get();
    if (!currentProjectId || !currentPageId) return;

    set({
      projects: projects.map((proj) =>
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
    const { projects, currentProjectId, currentPageId } = get();
    if (!currentProjectId || !currentPageId) return;

    set({
      projects: projects.map((proj) =>
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
      const { projects } = get();
      set({
        projects: projects.map((proj) =>
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

    socket.on("usersCount", (count: number) => {
      set({ onlineUsers: count });
    });
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
    return (
      projects.find((p) => p.id === currentProjectId)?.pages.find((pg) => pg.id === currentPageId) || null
    );
  },

  getComponents: (pageId: string) => {
    const project = get().getCurrentProject();
    const page = project?.pages.find((p) => p.id === pageId);
    return page?.elements || [];
  },

  setComponents: (pageId: string, elements: ElementData[]) => {
    const { projects, currentProjectId } = get();
    if (!currentProjectId) return;

    set({
      projects: projects.map((proj) =>
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
}));
