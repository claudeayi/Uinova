import { useState } from "react";
import { cn } from "@/lib/utils"; // helper classNames si tu l’as
import { toast } from "react-hot-toast";

interface LiveEditorProps {
  onSelect?: (component: any) => void;
}

interface DroppedComponent {
  id: string;
  type: string;
  label: string;
  props?: Record<string, any>;
}

/* ===============================
   LiveEditor – Zone de travail
=============================== */
export default function LiveEditor({ onSelect }: LiveEditorProps) {
  const [components, setComponents] = useState<DroppedComponent[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Gestion du drop
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);

    const type = e.dataTransfer.getData("component-type");
    if (!type) return;

    const newComponent: DroppedComponent = {
      id: Date.now().toString(),
      type,
      label: type,
      props: { text: type },
    };

    setComponents((prev) => [...prev, newComponent]);
    toast.success(`➕ ${type} ajouté`);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  // Sélection
  function handleSelect(c: DroppedComponent) {
    setSelectedId(c.id);
    onSelect?.(c);
  }

  return (
    <div
      className={cn(
        "w-full h-full p-6 overflow-auto transition border-2 rounded-lg",
        dragOver
          ? "border-dashed border-indigo-500 bg-indigo-50 dark:bg-slate-800/50"
          : "border-transparent"
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {components.length === 0 ? (
        <p className="text-gray-400 text-center mt-20">
          Glissez-déposez des composants ici
        </p>
      ) : (
        <div className="grid gap-3">
          {components.map((c) => (
            <div
              key={c.id}
              onClick={() => handleSelect(c)}
              className={cn(
                "p-4 rounded border cursor-pointer transition",
                selectedId === c.id
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/40"
                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow"
              )}
            >
              {c.type === "Bouton" && (
                <button className="px-4 py-2 bg-indigo-600 text-white rounded">
                  {c.props?.text || "Bouton"}
                </button>
              )}
              {c.type === "Texte" && (
                <p className="text-gray-700 dark:text-gray-200">
                  {c.props?.text || "Texte"}
                </p>
              )}
              {c.type === "Image" && (
                <img
                  src={c.props?.src || "https://via.placeholder.com/150"}
                  alt="Aperçu"
                  className="max-w-full h-auto rounded"
                />
              )}
              {c.type === "Formulaire" && (
                <form className="space-y-2">
                  <input
                    type="text"
                    placeholder="Nom"
                    className="w-full px-3 py-2 border rounded dark:bg-slate-700"
                  />
                  <button className="px-4 py-2 bg-green-600 text-white rounded">
                    Envoyer
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
