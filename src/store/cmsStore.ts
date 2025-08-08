import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";

export type CMSField = string;           // ex: "title", "subtitle"
export type CMSItem = Record<string, any>;

export interface Collection {
  id: string;
  name: string;                          // ex: "Features"
  fields: CMSField[];                    // ex: ["title", "subtitle"]
  items: CMSItem[];                      // ex: [{ title: "...", subtitle: "..." }]
}

interface CMSState {
  // State
  collections: Collection[];
  selectedCollectionId: string | null;

  // Selectors
  getCollection: (collectionId: string) => Collection | undefined;
  getItems: (collectionId: string) => CMSItem[];
  hasField: (collectionId: string, field: string) => boolean;

  // Collections CRUD
  addCollection: (name: string, fields: CMSField[]) => string;
  updateCollection: (collectionId: string, patch: Partial<Pick<Collection, "name" | "fields">>) => void;
  removeCollection: (collectionId: string) => void;
  selectCollection: (collectionId: string | null) => void;

  // Items CRUD
  addItem: (collectionId: string, item: CMSItem) => void;
  updateItem: (collectionId: string, index: number, patch: Partial<CMSItem>) => void;
  removeItem: (collectionId: string, index: number) => void;
  clearItems: (collectionId: string) => void;

  // Utils
  importCollections: (data: Collection[]) => void;
  exportCollections: () => Collection[];
  reset: () => void;
}

// util id
const uid = () => Math.random().toString(36).slice(2);

const initialState: Pick<CMSState, "collections" | "selectedCollectionId"> = {
  collections: [
    {
      id: "features",
      name: "Features",
      fields: ["title", "subtitle"],
      items: [
        { title: "Rapide",        subtitle: "Build en quelques minutes" },
        { title: "Collaboratif",  subtitle: "Éditez à plusieurs en live" },
        { title: "Exportable",    subtitle: "HTML/CSS/Flutter en 1 clic" },
      ],
    },
  ],
  selectedCollectionId: "features",
};

export const useCMS = create<CMSState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // --------- Selectors
        getCollection: (id) => get().collections.find((c) => c.id === id),
        getItems: (id) => get().getCollection(id)?.items || [],
        hasField: (id, field) => !!get().getCollection(id)?.fields.includes(field),

        // --------- Collections
        addCollection: (name, fields) => {
          const id = uid();
          set((state) => ({
            collections: [...state.collections, { id, name, fields, items: [] }],
            selectedCollectionId: id,
          }));
          return id;
        },

        updateCollection: (collectionId, patch) =>
          set((state) => ({
            collections: state.collections.map((c) =>
              c.id === collectionId ? { ...c, ...patch } : c
            ),
          })),

        removeCollection: (collectionId) =>
          set((state) => {
            const next = state.collections.filter((c) => c.id !== collectionId);
            const selected =
              state.selectedCollectionId === collectionId ? (next[0]?.id ?? null) : state.selectedCollectionId;
            return { collections: next, selectedCollectionId: selected };
          }),

        selectCollection: (collectionId) => set({ selectedCollectionId: collectionId }),

        // --------- Items
        addItem: (collectionId, item) =>
          set((state) => ({
            collections: state.collections.map((c) => {
              if (c.id !== collectionId) return c;
              // Filtre les champs non déclarés (sécurité légère)
              const safe = Object.fromEntries(
                Object.entries(item).filter(([k]) => c.fields.includes(k))
              );
              return { ...c, items: [...c.items, safe] };
            }),
          })),

        updateItem: (collectionId, index, patch) =>
          set((state) => ({
            collections: state.collections.map((c) => {
              if (c.id !== collectionId) return c;
              const items = c.items.map((it, i) =>
                i === index
                  ? Object.fromEntries(
                      Object.entries({ ...it, ...patch }).filter(([k]) => c.fields.includes(k))
                    )
                  : it
              );
              return { ...c, items };
            }),
          })),

        removeItem: (collectionId, index) =>
          set((state) => ({
            collections: state.collections.map((c) => {
              if (c.id !== collectionId) return c;
              const items = c.items.slice();
              items.splice(index, 1);
              return { ...c, items };
            }),
          })),

        clearItems: (collectionId) =>
          set((state) => ({
            collections: state.collections.map((c) =>
              c.id === collectionId ? { ...c, items: [] } : c
            ),
          })),

        // --------- Import / Export / Reset
        importCollections: (data) => {
          // petite validation de base
          const ok = Array.isArray(data) && data.every((c) =>
            typeof c?.id === "string" &&
            typeof c?.name === "string" &&
            Array.isArray(c?.fields) &&
            Array.isArray(c?.items)
          );
          if (!ok) throw new Error("Format d’import CMS invalide");
          set({
            collections: data,
            selectedCollectionId: data[0]?.id ?? null,
          });
        },

        exportCollections: () => structuredClone(get().collections),

        reset: () => set(structuredClone(initialState)),
      }),
      {
        name: "uinova-cms",
        // version: 1,
        // migrate: async (persisted, version) => persisted, // si tu versions plus tard
        partialize: (state) => ({
          collections: state.collections,
          selectedCollectionId: state.selectedCollectionId,
        }),
      }
    )
  )
);
