// src/components/editor/ComponentPalette.tsx
import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import {
  Plus,
  Type,
  Image as ImageIcon,
  Layout,
  Grid,
  AlignLeft,
  FormInput,
  Navigation,
  Square,
} from "lucide-react";

/* ============================================================================
 * Types
 * ========================================================================= */
interface ComponentItem {
  id: string;
  label: string;
  icon: JSX.Element;
  type: string;
  category: "Base" | "Layout" | "Media" | "Navigation";
}

/* ============================================================================
 * Liste des composants disponibles
 * ========================================================================= */
const COMPONENTS: ComponentItem[] = [
  // Base
  { id: "btn", label: "Bouton", icon: <Plus className="w-4 h-4" />, type: "button", category: "Base" },
  { id: "txt", label: "Texte", icon: <Type className="w-4 h-4" />, type: "text", category: "Base" },

  // Media
  { id: "img", label: "Image", icon: <ImageIcon className="w-4 h-4" />, type: "image", category: "Media" },
  { id: "vid", label: "Vidéo", icon: <Square className="w-4 h-4" />, type: "video", category: "Media" },

  // Layout
  { id: "box", label: "Container", icon: <Layout className="w-4 h-4" />, type: "container", category: "Layout" },
  { id: "grid", label: "Grille", icon: <Grid className="w-4 h-4" />, type: "grid", category: "Layout" },
  { id: "stack", label: "Stack", icon: <AlignLeft className="w-4 h-4" />, type: "stack", category: "Layout" },

  // Navigation
  { id: "navbar", label: "Navbar", icon: <Navigation className="w-4 h-4" />, type: "navbar", category: "Navigation" },
  { id: "footer", label: "Footer", icon: <Navigation className="w-4 h-4" />, type: "footer", category: "Navigation" },

  // Formulaires
  { id: "form", label: "Formulaire", icon: <FormInput className="w-4 h-4" />, type: "form", category: "Base" },
];

/* ============================================================================
 * Élément draggable
 * ========================================================================= */
function DraggableItem({ item }: { item: ComponentItem }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: item,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      aria-label={`Composant ${item.label}`}
      role="button"
      title={`Ajouter ${item.label}`}
      className={`flex items-center gap-2 px-3 py-2 rounded cursor-grab select-none
                  bg-slate-100 dark:bg-slate-800
                  hover:bg-slate-200 dark:hover:bg-slate-700 transition
                  focus:outline-none focus:ring-2 focus:ring-indigo-500
                  ${isDragging ? "opacity-50 ring-2 ring-indigo-400" : ""}`}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
      }}
    >
      {item.icon}
      <span className="text-sm font-medium">{item.label}</span>
    </div>
  );
}

/* ============================================================================
 * Palette principale
 * ========================================================================= */
export default function ComponentPalette() {
  const [search, setSearch] = useState("");

  // Normalisation recherche (ignore accents, majuscules, espaces)
  const normalize = (str: string) =>
    str.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

  const filtered = COMPONENTS.filter((c) =>
    normalize(c.label).includes(normalize(search))
  );

  // Regroupement par catégorie
  const grouped = filtered.reduce<Record<string, ComponentItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <aside className="w-64 h-full border-r dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-4 overflow-y-auto">
      {/* Titre */}
      <h2 className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-2">
        🧩 Composants
      </h2>

      {/* Barre de recherche */}
      <input
        type="text"
        placeholder="Rechercher..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-2 py-1 text-sm rounded border dark:bg-slate-800 dark:border-slate-700"
      />

      {/* Liste */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Aucun composant trouvé</p>
        ) : (
          Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-2">
                {category}
              </h3>
              <div className="space-y-2">
                {items.map((item) => (
                  <DraggableItem key={item.id} item={item} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
