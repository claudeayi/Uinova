// src/components/editor/Canvas.tsx
import { useDrop } from "react-dnd";
import { ElementData } from "@/store/useAppStore";
import { useState } from "react";
import { cn } from "@/utils/cn";

interface CanvasProps {
  elements?: ElementData[];
  onDropComponent?: (el: ElementData) => void;
  onSelectElement?: (id: string) => void;
}

export default function Canvas({
  elements = [],
  onDropComponent,
  onSelectElement,
}: CanvasProps) {
  const [hovered, setHovered] = useState(false);

  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: "COMPONENT",
      drop: (item: ElementData) => {
        if (onDropComponent) onDropComponent(item);
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
      }),
    }),
    [onDropComponent]
  );

  return (
    <div
      ref={drop}
      className={cn(
        "relative min-h-[300px] rounded-lg border-2 border-dashed transition-colors",
        "bg-white dark:bg-slate-900 shadow-inner",
        isOver || hovered
          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
          : "border-gray-400 dark:border-slate-700"
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Overlay si vide */}
      {elements.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500 dark:text-gray-400 pointer-events-none select-none">
          <span className="text-sm">🚀 Glissez vos composants ici</span>
        </div>
      )}

      {/* Rendu des éléments */}
      <div className="p-4 space-y-3">
        {elements.map((el) => (
          <div
            key={el.id}
            onClick={() => onSelectElement?.(el.id)}
            className="p-2 border rounded hover:border-blue-500 cursor-pointer bg-white dark:bg-slate-800 transition"
          >
            {el.type === "button" && (
              <button className="px-3 py-1 rounded bg-blue-600 text-white">
                {el.props?.label || "Bouton"}
              </button>
            )}
            {el.type === "input" && (
              <input
                className="border px-2 py-1 rounded w-full"
                placeholder={el.props?.label || "Champ texte"}
              />
            )}
            {el.type === "card" && (
              <div className="p-4 border rounded bg-gray-50 dark:bg-slate-700">
                {el.props?.label || "Carte"}
              </div>
            )}
            {el.type === "text" && (
              <p className="text-gray-800 dark:text-gray-200">
                {el.props?.content || "Texte"}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
