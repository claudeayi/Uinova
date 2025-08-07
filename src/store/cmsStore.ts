import { create } from "zustand";

export type CMSItem = Record<string, any>;

export interface Collection {
  id: string;
  name: string;
  fields: string[];
  items: CMSItem[];
}

interface CMSState {
  collections: Collection[];
  addCollection: (name: string, fields: string[]) => void;
  addItem: (collectionId: string, item: CMSItem) => void;
  getCollection: (collectionId: string) => Collection | undefined;
}

export const useCMS = create<CMSState>((set, get) => ({
  collections: [
    {
      id: "features",
      name: "Features",
      fields: ["title", "subtitle"],
      items: [
        { title: "Rapide", subtitle: "Build en quelques minutes" },
        { title: "Collaboratif", subtitle: "Éditez à plusieurs en live" },
        { title: "Exportable", subtitle: "HTML/CSS/Flutter en 1 clic" },
      ],
    },
  ],
  addCollection: (name, fields) =>
    set({
      collections: [
        ...get().collections,
        { id: Math.random().toString(36).slice(2), name, fields, items: [] },
      ],
    }),
  addItem: (collectionId, item) =>
    set({
      collections: get().collections.map((c) =>
        c.id === collectionId ? { ...c, items: [...c.items, item] } : c
      ),
    }),
  getCollection: (id) => get().collections.find((c) => c.id === id),
}));
