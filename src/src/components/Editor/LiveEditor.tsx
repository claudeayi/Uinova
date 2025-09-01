// src/components/Editor/LiveEditor.tsx
import {
  useState,
  useImperativeHandle,
  forwardRef,
  useRef,
  useEffect,
} from "react";
import { cn } from "@/lib/utils";
import { toast } from "react-hot-toast";

export interface DroppedComponent {
  id: string;
  type: string;
  label: string;
  props: Record<string, any>;
}

export interface LiveEditorHandles {
  undo: () => void;
  redo: () => void;
}

interface LiveEditorProps {
  onSelect?: (component: DroppedComponent) => void;
  onUpdateComponent?: (id: string, props: Record<string, any>) => void;
  previewOverride?: DroppedComponent | null; // ✅ preview complet
}

/* ===============================
   LiveEditor – Zone de travail
=============================== */
const LiveEditor = forwardRef<LiveEditorHandles, LiveEditorProps>(
  ({ onSelect, onUpdateComponent, previewOverride }, ref) => {
    const [components, setComponents] = useState<DroppedComponent[]>([]);
    const [dragOver, setDragOver] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Historique
    const historyRef = useRef<DroppedComponent[][]>([]);
    const futureRef = useRef<DroppedComponent[][]>([]);

    // Enregistrer un snapshot dans l’historique
    function pushHistory(newState: DroppedComponent[]) {
      historyRef.current.push(components);
      futureRef.current = []; // reset redo
      setComponents(newState);
    }

    /* ===============================
       Expose undo/redo aux parents
    =============================== */
    useImperativeHandle(ref, () => ({
      undo: () => {
        if (historyRef.current.length === 0) {
          toast("⚠️ Rien à annuler");
          return;
        }
        const prev = historyRef.current.pop()!;
        futureRef.current.push(components);
        setComponents(prev);
      },
      redo: () => {
        if (futureRef.current.length === 0) {
          toast("⚠️ Rien à refaire");
          return;
        }
        const next = futureRef.current.pop()!;
        historyRef.current.push(components);
        setComponents(next);
      },
    }));

    /* ===============================
       Drag & Drop
    =============================== */
    function handleDrop(e: React.DragEvent) {
      e.preventDefault();
      setDragOver(false);

      const type = e.dataTransfer.getData("component-type");
      if (!type) return;

      const defaults: Record<string, any> = {
        Bouton: { text: "Nouveau bouton" },
        Texte: { text: "Nouveau texte" },
        Image: { src: "https://via.placeholder.com/150", width: 100 },
        Formulaire: { buttonText: "Envoyer" },
      };

      const newComponent: DroppedComponent = {
        id: Date.now().toString(),
        type,
        label: type,
        props: defaults[type] || {},
      };

      pushHistory([...components, newComponent]);
      toast.success(`➕ ${type} ajouté`);
    }

    function handleDragOver(e: React.DragEvent) {
      e.preventDefault();
      setDragOver(true);
    }

    function handleDragLeave() {
      setDragOver(false);
    }

    /* ===============================
       Sélection & mise à jour
    =============================== */
    function handleSelect(c: DroppedComponent) {
      setSelectedId(c.id);
      onSelect?.(c);
    }

    function handleUpdate(id: string, newProps: Record<string, any>) {
      const newState = components.map((c) =>
        c.id === id ? { ...c, props: newProps } : c
      );
      pushHistory(newState);
      onUpdateComponent?.(id, newProps);
    }

    /* ===============================
       Render
    =============================== */
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
            {components.map((c) => {
              const isSelected = selectedId === c.id;
              const display =
                isSelected && previewOverride && previewOverride.id === c.id
                  ? previewOverride
                  : c;

              return (
                <div
                  key={c.id}
                  onClick={() => handleSelect(display)}
                  className={cn(
                    "p-4 rounded border cursor-pointer transition",
                    isSelected
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/40"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow"
                  )}
                >
                  {display.type === "Bouton" && (
                    <button
                      style={{ backgroundColor: display.props?.color }}
                      className="px-4 py-2 bg-indigo-600 text-white rounded"
                    >
                      {display.props?.text || "Bouton"}
                    </button>
                  )}

                  {display.type === "Texte" && (
                    <p className="text-gray-700 dark:text-gray-200">
                      {display.props?.text || "Texte"}
                    </p>
                  )}

                  {display.type === "Image" && (
                    <img
                      src={display.props?.src || "https://via.placeholder.com/150"}
                      alt="Aperçu"
                      style={{ width: `${display.props?.width || 100}%` }}
                      className="max-w-full h-auto rounded"
                    />
                  )}

                  {display.type === "Formulaire" && (
                    <form className="space-y-2">
                      <input
                        type="text"
                        placeholder="Nom"
                        className="w-full px-3 py-2 border rounded dark:bg-slate-700"
                      />
                      <button className="px-4 py-2 bg-green-600 text-white rounded">
                        {display.props?.buttonText || "Envoyer"}
                      </button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }
);

export default LiveEditor;
