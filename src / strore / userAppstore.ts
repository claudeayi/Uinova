import { create } from "zustand";
import { socket } from "../socket";

export type ElementData = {
  type: string;
  props: Record<string, any>;
  id: string;
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
};

interface AppState {
  projects: ProjectData[];
  currentProjectId: string | null;
  currentPageId: string | null;
  setProjects: (projects: ProjectData[]) => void;
  setCurrentProjectId: (id: string) => void;
  setCurrentPageId: (id: string) => void;
  addProject: (name: string) => void;
  addPage: (name: string) => void;
  updateElements: (elements: ElementData[]) => void;
  saveSnapshot: () => void;
  undo: () => void;
  redo: () => void;
  emitElements: (elements: ElementData[]) => void;
  listenElements: () => void;
  onlineUsers: number;
  setOnlineUsers: (count: number) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  projects: [
    {
      id: "default",
      name: "Projet principal",
      pages: [
        {
          id: "home",
          name: "Page d'accueil",
          elements: [],
          history: [],
          future: [],
        }
      ]
    }
  ],
  currentProjectId: "default",
  currentPageId: "home",

  setProjects: (projects) => set({ projects }),

  setCurrentProjectId: (id) => set({ currentProjectId: id }),

  setCurrentPageId: (id) => set({ currentPageId: id }),

  addProject: (name) => {
    const id = Math.random().toString(36).substr(2, 9);
    set({
      projects: [
        ...get().projects,
        {
          id,
          name,
          pages: [
            {
              id: "home",
              name: "Page d'accueil",
              elements: [],
              history: [],
              future: [],
            }
          ]
        }
      ],
      currentProjectId: id,
      currentPageId: "home"
    });
  },

  addPage: (name) => {
    const { projects, currentProjectId } = get();
    const id = Math.random().toString(36).substr(2, 9);
    set({
      projects: projects.map(proj =>
        proj.id === currentProjectId
          ? {
              ...proj,
              pages: [
                ...proj.pages,
                {
                  id,
                  name,
                  elements: [],
                  history: [],
                  future: [],
                }
              ]
            }
          : proj
      ),
      currentPageId: id,
    });
  },

  updateElements: (elements) => {
    const { projects, currentProjectId, currentPageId } = get();
    set({
      projects: projects.map(proj =>
        proj.id === currentProjectId
          ? {
              ...proj,
              pages: proj.pages.map(p =>
                p.id === currentPageId
                  ? { ...p, elements }
                  : p
              )
            }
          : proj
      )
    });
  },

  saveSnapshot: () => {
    const { projects, currentProjectId, currentPageId } = get();
    set({
      projects: projects.map(proj =>
        proj.id === currentProjectId
          ? {
              ...proj,
              pages: proj.pages.map(p =>
                p.id === currentPageId
                  ? { ...p, history: [...(p.history || []), p.elements], future: [] }
                  : p
              )
            }
          : proj
      )
    });
  },

  undo: () => {
    const { projects, currentProjectId, currentPageId } = get();
    set({
      projects: projects.map(proj =>
        proj.id === currentProjectId
          ? {
              ...proj,
              pages: proj.pages.map(p => {
                if (p.id !== currentPageId || !p.history || p.history.length < 2) return p;
                const hist = p.history.slice(0, -1);
                return {
                  ...p,
                  elements: hist[hist.length - 1],
                  history: hist,
                  future: [p.elements, ...(p.future || [])]
                };
              })
            }
          : proj
      )
    });
  },

  redo: () => {
    const { projects, currentProjectId, currentPageId } = get();
    set({
      projects: projects.map(proj =>
        proj.id === currentProjectId
          ? {
              ...proj,
              pages: proj.pages.map(p => {
                if (p.id !== currentPageId || !p.future || p.future.length < 1) return p;
                const [next, ...rest] = p.future;
                return {
                  ...p,
                  elements: next,
                  history: [...(p.history || []), next],
                  future: rest
                };
              })
            }
          : proj
      )
    });
  },

  // --- Collaboration live Socket.io ---
  emitElements: (elements) => {
    const { currentProjectId, currentPageId } = get();
    socket.emit("updateElements", {
      projectId: currentProjectId,
      pageId: currentPageId,
      elements
    });
    get().updateElements(elements);
  },
  listenElements: () => {
    // Prévient les doublons lors du hot reload/rafraîchissement
    socket.off("updateElements");
    socket.off("usersCount");
    socket.on("updateElements", (data: { projectId: string, pageId: string, elements: ElementData[] }) => {
      const { projects } = get();
      set({
        projects: projects.map(proj =>
          proj.id === data.projectId
            ? {
                ...proj,
                pages: proj.pages.map(p =>
                  p.id === data.pageId
                    ? { ...p, elements: data.elements }
                    : p
                )
              }
            : proj
        )
      });
    });
    // --- Présence utilisateurs connectés ---
    socket.on("usersCount", (count: number) => {
      set({ onlineUsers: count });
    });
  },

  onlineUsers: 1,
  setOnlineUsers: (count) => set({ onlineUsers: count }),
}));
