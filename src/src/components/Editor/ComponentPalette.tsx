// src/components/Editor/ComponentPalette.tsx
import { useState } from "react";
import { DndContext, useDraggable } from "@dnd-kit/core";
import { Plus, Square, Type, Image, Layout } from "lucide-react";

/* ============================================================================
 * Composant de Palette – éléments drag & drop
 * ========================================================================= */
interface ComponentItem {
  id: string;
  label: string;
  icon: JSX.Element;
  type: "button" | "text" | "image" | "container";
}

const COMPONENTS: ComponentItem[] = [
  { id: "btn", label: "Bouton", icon: <Plus className="w-4 h-4" />, type: "button" },
  { id: "txt", label: "Texte", icon: <Type className="w-4 h-4" />, type: "text" },
  { id: "img", label: "Image", icon: <Image className="w-4 h-4" />, type: "image" },
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
      className={`flex items-center gap-2 px-3 py-2 rounded cursor-grab bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition ${
        isDragging ? "opacity-50" : ""
      }`}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
      }}
    >
      {item.icon}
      <span className="text-sm">{item.label}</span>
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
      <h2 className="font-semibold text-blue-600 dark:text-blue-400">🧩 Composants</h2>
      <input
        type="text"
        placeholder="Rechercher..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-2 py-1 text-sm rounded border dark:bg-slate-800 dark:border-slate-700"
      />
      <div className="space-y-2">
        {filtered.map((item) => (
          <DraggableItem key={item.id} item={item} />
        ))}
      </div>
    </aside>
  );
}
