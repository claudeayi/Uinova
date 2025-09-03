import {
  useImperativeHandle,
  forwardRef,
  useState,
  useRef,
  useEffect,
} from "react";
import { cn } from "@/lib/utils";
import { toast } from "react-hot-toast";
import { useAppStore, ElementData } from "@/store/useAppStore";

export interface DroppedComponent extends ElementData {}

export interface LiveEditorHandles {
  undo: () => void;
  redo: () => void;
}

interface LiveEditorProps {
  onSelect?: (component: DroppedComponent | DroppedComponent[]) => void;
  previewOverride?: DroppedComponent | null;
}

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
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [dragOver, setDragOver] = useState(false);

    const resizingRef = useRef<any>(null);
    const rotatingRef = useRef<any>(null);

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
      if (!currentPageId) return;

      const type = e.dataTransfer.getData("component-type");
      if (!type) return;

      const defaults: Record<string, any> = {
        Bouton: { text: "Nouveau bouton", x: 40, y: 40, width: 120, height: 40 },
        Texte: { text: "Nouveau texte", x: 40, y: 40, width: 200, height: 40 },
        Image: {
          src: "https://via.placeholder.com/150",
          x: 40,
          y: 40,
          width: 150,
          height: 150,
        },
        Formulaire: {
          buttonText: "Envoyer",
          x: 40,
          y: 40,
          width: 250,
          height: 120,
        },
      };

      const newComponent: DroppedComponent = {
        id: crypto.randomUUID(),
        type,
        props: { ...defaults[type], rotate: 0, zIndex: components.length + 1 },
      };

      saveSnapshot();
      updateElements([...components, newComponent]);
      toast.success(`➕ ${type} ajouté`);
    }

    /* ===============================
       Sélection
    =============================== */
    function handleSelect(c: DroppedComponent, multi = false) {
      if (multi) {
        setSelectedIds((prev) =>
          prev.includes(c.id) ? prev.filter((id) => id !== c.id) : [...prev, c.id]
        );
      } else {
        setSelectedIds([c.id]);
      }
      onSelect?.(
        multi
          ? components.filter((el) => selectedIds.includes(el.id))
          : c
      );
    }

    /* ===============================
       Update / Delete / Duplicate
    =============================== */
    function updateComponent(id: string, newProps: Record<string, any>) {
      if (!currentPageId) return;
      const newState = components.map((c) =>
        c.id === id ? { ...c, props: { ...c.props, ...newProps } } : c
      );
      saveSnapshot();
      updateElements(newState);
    }

    function deleteComponent(id: string) {
      saveSnapshot();
      updateElements(components.filter((c) => c.id !== id));
      setSelectedIds((prev) => prev.filter((s) => s !== id));
    }

    function duplicateComponent(id: string) {
      const target = components.find((c) => c.id === id);
      if (!target) return;
      const clone: DroppedComponent = {
        ...target,
        id: crypto.randomUUID(),
        props: {
          ...target.props,
          x: target.props.x + 20,
          y: target.props.y + 20,
          zIndex: target.props.zIndex + 1,
        },
      };
      saveSnapshot();
      updateElements([...components, clone]);
      setSelectedIds([clone.id]);
    }

    function bringToFront(id: string) {
      const maxZ = Math.max(...components.map((c) => c.props.zIndex || 1), 1);
      updateComponent(id, { zIndex: maxZ + 1 });
    }

    function sendToBack(id: string) {
      updateComponent(id, { zIndex: 1 });
    }

    /* ===============================
       Déplacement Snap-to-grid
    =============================== */
    function handleDragEnd(e: React.DragEvent, c: DroppedComponent) {
      const canvasRect = (e.currentTarget.parentNode as HTMLElement).getBoundingClientRect();
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const snap = 20;
      const x = Math.round((rect.left - canvasRect.left) / snap) * snap;
      const y = Math.round((rect.top - canvasRect.top) / snap) * snap;
      updateComponent(c.id, { x, y });
    }

    /* ===============================
       Resize
    =============================== */
    function startResize(e: React.MouseEvent, c: DroppedComponent) {
      e.stopPropagation();
      resizingRef.current = {
        id: c.id,
        startX: e.clientX,
        startY: e.clientY,
        startW: c.props.width,
        startH: c.props.height,
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
      updateComponent(id, { width, height });
    }

    function stopResize() {
      resizingRef.current = null;
      document.removeEventListener("mousemove", onResizing);
      document.removeEventListener("mouseup", stopResize);
    }

    /* ===============================
       Rotation
    =============================== */
    function startRotate(e: React.MouseEvent, c: DroppedComponent) {
      e.stopPropagation();
      rotatingRef.current = {
        id: c.id,
        startX: e.clientX,
        startY: e.clientY,
        startAngle: c.props.rotate || 0,
      };
      document.addEventListener("mousemove", onRotating);
      document.addEventListener("mouseup", stopRotate);
    }

    function onRotating(e: MouseEvent) {
      if (!rotatingRef.current) return;
      const { id, startX, startY, startAngle } = rotatingRef.current;
      const dx = e.clientX - startX;
      const angle = startAngle + dx * 0.5;
      updateComponent(id, { rotate: angle });
    }

    function stopRotate() {
      rotatingRef.current = null;
      document.removeEventListener("mousemove", onRotating);
      document.removeEventListener("mouseup", stopRotate);
    }

    /* ===============================
       Raccourcis clavier
    =============================== */
    useEffect(() => {
      function handleKey(e: KeyboardEvent) {
        if (!selectedIds.length) return;
        if (e.key === "Delete" || e.key === "Backspace") {
          selectedIds.forEach((id) => deleteComponent(id));
        }
        if (e.ctrlKey && e.key.toLowerCase() === "d") {
          selectedIds.forEach((id) => duplicateComponent(id));
        }
        if (e.ctrlKey && e.key.toLowerCase() === "z") {
          undo();
        }
        if (e.ctrlKey && e.key.toLowerCase() === "y") {
          redo();
        }
      }
      window.addEventListener("keydown", handleKey);
      return () => window.removeEventListener("keydown", handleKey);
    }, [selectedIds, components]);

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
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
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
              const isSelected = selectedIds.includes(c.id);
              const display =
                isSelected && previewOverride && previewOverride.id === c.id
                  ? previewOverride
                  : c;

              const {
                x = 50,
                y = 50,
                width = 120,
                height = 40,
                rotate = 0,
                zIndex = 1,
              } = display.props || {};

              return (
                <div
                  key={c.id}
                  draggable
                  onDragEnd={(e) => handleDragEnd(e, display)}
                  onClick={(e) => handleSelect(display, e.shiftKey)}
                  className={cn(
                    "absolute border cursor-move transition group select-none",
                    isSelected
                      ? "border-blue-500 shadow-lg"
                      : "border-slate-200 dark:border-slate-700 hover:shadow"
                  )}
                  style={{
                    left: x,
                    top: y,
                    width,
                    height,
                    transform: `rotate(${rotate}deg)`,
                    zIndex,
                  }}
                >
                  {/* Rendu */}
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

                  {/* Resize */}
                  {isSelected && (
                    <div
                      onMouseDown={(e) => startResize(e, display)}
                      className="absolute w-3 h-3 bg-blue-500 bottom-0 right-0 cursor-se-resize rounded-full"
                    />
                  )}

                  {/* Rotation */}
                  {isSelected && (
                    <div
                      onMouseDown={(e) => startRotate(e, display)}
                      className="absolute w-3 h-3 bg-red-500 -top-4 right-2 cursor-crosshair rounded-full"
                    />
                  )}

                  {/* Boutons avant/arrière */}
                  {isSelected && (
                    <div className="absolute -top-6 left-0 flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          bringToFront(display.id);
                        }}
                        className="px-2 py-1 bg-white border rounded text-xs"
                      >
                        ⬆️ Avant
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          sendToBack(display.id);
                        }}
                        className="px-2 py-1 bg-white border rounded text-xs"
                      >
                        ⬇️ Arrière
                      </button>
                    </div>
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
