// src/components/Editor/LiveEditor.tsx
import {
  useImperativeHandle,
  forwardRef,
  useState,
  useRef,
} from "react";
import { cn } from "@/lib/utils";
import { toast } from "react-hot-toast";
import { useAppStore, ElementData } from "@/store/useAppStore";

/* ===============================
   Types
=============================== */
export interface DroppedComponent extends ElementData {}

export interface LiveEditorHandles {
  undo: () => void;
  redo: () => void;
}

interface LiveEditorProps {
  onSelect?: (component: DroppedComponent) => void;
  previewOverride?: DroppedComponent | null;
}

/* ===============================
   LiveEditor – Zone de travail avec grille + drag + resize
=============================== */
const LiveEditor = forwardRef<LiveEditorHandles, LiveEditorProps>(
  ({ onSelect, previewOverride }, ref) => {
    const {
      currentPageId,
      getCurrentPage,
      updateElements,
      saveSnapshot,
      undo,
      redo,
    } = useAppStore();

    const page = getCurrentPage();
    const components = page?.elements || [];
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);

    const resizingRef = useRef<{ id: string; startX: number; startY: number; startW: number; startH: number } | null>(null);

    /* ===============================
       Expose undo/redo
    =============================== */
    useImperativeHandle(ref, () => ({
      undo: () => {
        if (!page || page.history.length < 2) {
          toast("⚠️ Rien à annuler");
          return;
        }
        undo();
      },
      redo: () => {
        if (!page || page.future.length === 0) {
          toast("⚠️ Rien à refaire");
          return;
        }
        redo();
      },
    }));

    /* ===============================
       Drag & Drop palette
    =============================== */
    function handleDrop(e: React.DragEvent) {
      e.preventDefault();
      setDragOver(false);

      const type = e.dataTransfer.getData("component-type");
      if (!type || !currentPageId) return;

      const defaults: Record<string, any> = {
        Bouton: { text: "Nouveau bouton", x: 40, y: 40, width: 120, height: 40 },
        Texte: { text: "Nouveau texte", x: 40, y: 40, width: 200, height: 40 },
        Image: { src: "https://via.placeholder.com/150", x: 40, y: 40, width: 150, height: 150 },
        Formulaire: { buttonText: "Envoyer", x: 40, y: 40, width: 250, height: 120 },
      };

      const newComponent: DroppedComponent = {
        id: crypto.randomUUID(),
        type,
        props: defaults[type] || { x: 40, y: 40, width: 100, height: 40 },
      };

      saveSnapshot();
      updateElements([...components, newComponent]);
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
       Sélection
    =============================== */
    function handleSelect(c: DroppedComponent) {
      setSelectedId(c.id);
      onSelect?.(c);
    }

    function handleUpdate(id: string, newProps: Record<string, any>) {
      if (!currentPageId) return;
      const newState = components.map((c) =>
        c.id === id ? { ...c, props: { ...c.props, ...newProps } } : c
      );
      saveSnapshot();
      updateElements(newState);
    }

    /* ===============================
       Déplacement avec Snap-to-grid
    =============================== */
    function handleDragEnd(e: React.DragEvent, c: DroppedComponent) {
      const canvasRect = (e.currentTarget.parentNode as HTMLElement).getBoundingClientRect();
      const rect = (e.target as HTMLElement).getBoundingClientRect();

      const snap = 20;
      const x = Math.round((rect.left - canvasRect.left) / snap) * snap;
      const y = Math.round((rect.top - canvasRect.top) / snap) * snap;

      handleUpdate(c.id, { ...c.props, x, y });
    }

    /* ===============================
       Resize avec Snap-to-grid
    =============================== */
    function startResize(e: React.MouseEvent, c: DroppedComponent) {
      e.stopPropagation();
      resizingRef.current = {
        id: c.id,
        startX: e.clientX,
        startY: e.clientY,
        startW: c.props.width || 100,
        startH: c.props.height || 40,
      };
      document.addEventListener("mousemove", onResizing);
      document.addEventListener("mouseup", stopResize);
    }

    function onResizing(e: MouseEvent) {
      if (!resizingRef.current) return;
      const { id, startX, startY, startW, startH } = resizingRef.current;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      const snap = 20;
      const width = Math.max(40, Math.round((startW + dx) / snap) * snap);
      const height = Math.max(40, Math.round((startH + dy) / snap) * snap);

      handleUpdate(id, { width, height });
    }

    function stopResize() {
      resizingRef.current = null;
      document.removeEventListener("mousemove", onResizing);
      document.removeEventListener("mouseup", stopResize);
    }

    /* ===============================
       Render
    =============================== */
    return (
      <div
        className={cn(
          "w-full h-full overflow-auto transition border-2 rounded-lg relative",
          dragOver
            ? "border-dashed border-indigo-500 bg-indigo-50 dark:bg-slate-800/50"
            : "border-transparent"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {/* Grille */}
        <div
          className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_right,#ccc_1px,transparent_1px),linear-gradient(to_bottom,#ccc_1px,transparent_1px)]"
          style={{ backgroundSize: "20px 20px", opacity: 0.15 }}
        />

        {components.length === 0 ? (
          <p className="text-gray-400 text-center mt-20 relative z-10">
            Glissez-déposez des composants ici
          </p>
        ) : (
          <div className="relative">
            {components.map((c) => {
              const isSelected = selectedId === c.id;
              const display =
                isSelected && previewOverride && previewOverride.id === c.id
                  ? previewOverride
                  : c;

              const { x = 50, y = 50, width = 120, height = 40 } = display.props || {};

              return (
                <div
                  key={c.id}
                  draggable
                  onDragEnd={(e) => handleDragEnd(e, display)}
                  onClick={() => handleSelect(display)}
                  className={cn(
                    "absolute border cursor-move transition group",
                    isSelected
                      ? "border-blue-500 shadow-lg"
                      : "border-slate-200 dark:border-slate-700 hover:shadow"
                  )}
                  style={{ left: x, top: y, width, height }}
                >
                  {/* Rendu composant */}
                  {display.type === "Bouton" && (
                    <button
                      style={{ backgroundColor: display.props?.color }}
                      className="w-full h-full bg-indigo-600 text-white rounded"
                    >
                      {display.props?.text || "Bouton"}
                    </button>
                  )}
                  {display.type === "Texte" && (
                    <p className="p-2 text-gray-700 dark:text-gray-200">
                      {display.props?.text || "Texte"}
                    </p>
                  )}
                  {display.type === "Image" && (
                    <img
                      src={display.props?.src || "https://via.placeholder.com/150"}
                      alt="Aperçu"
                      className="w-full h-full object-cover rounded"
                    />
                  )}
                  {display.type === "Formulaire" && (
                    <form className="space-y-2 p-2">
                      <input
                        type="text"
                        placeholder="Nom"
                        className="w-full px-3 py-2 border rounded dark:bg-slate-700"
                      />
                      <button className="px-4 py-2 bg-green-600 text-white rounded w-full">
                        {display.props?.buttonText || "Envoyer"}
                      </button>
                    </form>
                  )}

                  {/* Handle resize */}
                  {isSelected && (
                    <div
                      onMouseDown={(e) => startResize(e, display)}
                      className="absolute w-3 h-3 bg-blue-500 bottom-0 right-0 cursor-se-resize rounded-full"
                    />
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
