import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Plus, Type, Image as ImageIcon, Layout } from "lucide-react";

/* ============================================================================
 * Types
 * ========================================================================= */
interface ComponentItem {
  id: string;
  label: string;
  icon: JSX.Element;
  type: "button" | "text" | "image" | "container";
}

/* ============================================================================
 * Liste des composants disponibles
 * ========================================================================= */
const COMPONENTS: ComponentItem[] = [
  { id: "btn", label: "Bouton", icon: <Plus className="w-4 h-4" />, type: "button" },
  { id: "txt", label: "Texte", icon: <Type className="w-4 h-4" />, type: "text" },
  { id: "img", label: "Image", icon: <ImageIcon className="w-4 h-4" />, type: "image" },
  { id: "box", label: "Container", icon: <Layout className="w-4 h-4" />, type: "container" },
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
      className={`flex items-center gap-2 px-3 py-2 rounded cursor-grab select-none 
                  bg-slate-100 dark:bg-slate-800 
                  hover:bg-slate-200 dark:hover:bg-slate-700 transition
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

  const filtered = COMPONENTS.filter((c) =>
    c.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <aside className="w-64 h-full border-r dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-4">
      {/* Titre */}
      <h2 className="font-semibold text-blue-600 dark:text-blue-400">🧩 Composants</h2>

      {/* Barre de recherche */}
      <input
        type="text"
        placeholder="Rechercher..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-2 py-1 text-sm rounded border dark:bg-slate-800 dark:border-slate-700"
      />

      {/* Liste */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Aucun composant trouvé</p>
        ) : (
          filtered.map((item) => <DraggableItem key={item.id} item={item} />)
        )}
      </div>
    </aside>
  );
}
