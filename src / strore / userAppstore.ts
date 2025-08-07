import { create } from "zustand";

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
};

interface AppState {
  pages: PageData[];
  currentPageId: string | null;
  setPages: (pages: PageData[]) => void;
  setCurrentPageId: (id: string) => void;
  addPage: (name: string) => void;
  updateElements: (elements: ElementData[]) => void;
  saveSnapshot: () => void;
  undo: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  pages: [
    {
      id: "home",
      name: "Page d'accueil",
      elements: [],
      history: [],
    }
  ],
  currentPageId: "home",
  setPages: (pages) => set({ pages }),
  setCurrentPageId: (id) => set({ currentPageId: id }),
  addPage: (name) => {
    const id = Math.random().toString(36).substr(2, 9);
    set({
      pages: [...get().pages, { id, name, elements: [], history: [] }],
      currentPageId: id
    });
  },
  updateElements: (elements) => {
    const { pages, currentPageId } = get();
    set({
      pages: pages.map(p =>
        p.id === currentPageId
          ? { ...p, elements }
          : p
      )
    });
  },
  saveSnapshot: () => {
    const { pages, currentPageId } = get();
    set({
      pages: pages.map(p =>
        p.id === currentPageId
          ? { ...p, history: [...(p.history || []), p.elements] }
          : p
      )
    });
  },
  undo: () => {
    const { pages, currentPageId } = get();
    set({
      pages: pages.map(p => {
        if (p.id !== currentPageId || !p.history || p.history.length < 2) return p;
        const hist = p.history.slice(0, -1);
        return { ...p, elements: hist[hist.length - 1], history: hist };
      })
    });
  }
}));
