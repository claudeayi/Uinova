import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalSpaceAround,
  BringToFront,
  SendToBack,
  Copy,
  Trash2,
  Group,
  Ungroup,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { DroppedComponent } from "./LiveEditor";

interface SelectionToolbarProps {
  selected: DroppedComponent[];
  clearSelection: () => void;
  canvasRef?: React.RefObject<HTMLDivElement>; // ✅ largeur/hauteur dynamiques
}

export default function SelectionToolbar({
  selected,
  clearSelection,
  canvasRef,
}: SelectionToolbarProps) {
  const { updateElements, getCurrentPage, saveSnapshot } = useAppStore();
  const page = getCurrentPage();
  if (!page || selected.length === 0) return null;

  const canvasWidth = canvasRef?.current?.offsetWidth || 800;
  const canvasHeight = canvasRef?.current?.offsetHeight || 600;

  // ✅ Met à jour plusieurs composants
  function applyUpdate(updateFn: (c: DroppedComponent) => DroppedComponent) {
    saveSnapshot();
    const newState = page.elements.map((c) =>
      selected.some((s) => s.id === c.id) ? updateFn(c) : c
    );
    updateElements(newState);
  }

  /* ------------------------------
     Alignements
  ------------------------------ */
  function alignHorizontal(pos: "left" | "center" | "right") {
    applyUpdate((c) => {
      const { width = 100, y = 0 } = c.props;
      let newX = c.props.x || 0;
      if (pos === "left") newX = 0;
      if (pos === "center") newX = (canvasWidth - width) / 2;
      if (pos === "right") newX = canvasWidth - width;
      return { ...c, props: { ...c.props, x: newX, y } };
    });
  }

  function alignVertical(pos: "top" | "middle" | "bottom") {
    applyUpdate((c) => {
      const { height = 100, x = 0 } = c.props;
      let newY = c.props.y || 0;
      if (pos === "top") newY = 0;
      if (pos === "middle") newY = (canvasHeight - height) / 2;
      if (pos === "bottom") newY = canvasHeight - height;
      return { ...c, props: { ...c.props, y: newY, x } };
    });
  }

  /* ------------------------------
     Z-Index
  ------------------------------ */
  function bringToFront() {
    const maxZ = Math.max(...page.elements.map((c) => c.props.zIndex || 1), 1);
    applyUpdate((c) => ({ ...c, props: { ...c.props, zIndex: maxZ + 1 } }));
  }
  function sendToBack() {
    applyUpdate((c) => ({ ...c, props: { ...c.props, zIndex: 0 } }));
  }

  /* ------------------------------
     Duplicate / Remove
  ------------------------------ */
  function duplicate() {
    saveSnapshot();
    const clones = selected.map((c) => ({
      ...c,
      id: crypto.randomUUID(),
      props: {
        ...c.props,
        x: (c.props.x || 0) + 20,
        y: (c.props.y || 0) + 20,
        zIndex: (c.props.zIndex || 1) + 1,
      },
    }));
    updateElements([...page.elements, ...clones]);
  }

  function remove() {
    saveSnapshot();
    updateElements(
      page.elements.filter((c) => !selected.some((s) => s.id === c.id))
    );
    clearSelection();
  }

  /* ------------------------------
     Group / Ungroup
  ------------------------------ */
  function groupSelection() {
    if (selected.length < 2) return;
    saveSnapshot();
    const groupId = crypto.randomUUID();
    const group: DroppedComponent = {
      id: groupId,
      type: "group",
      props: { label: "Groupe", x: 50, y: 50 },
      children: selected,
    };
    const newElements = [
      ...page.elements.filter((c) => !selected.some((s) => s.id === c.id)),
      group,
    ];
    updateElements(newElements);
    clearSelection();
  }

  function ungroupSelection() {
    saveSnapshot();
    const newElements = page.elements.flatMap((c) =>
      selected.includes(c) && c.type === "group" && c.children
        ? c.children
        : [c]
    );
    updateElements(newElements);
    clearSelection();
  }

  /* ------------------------------
     Rendu
  ------------------------------ */
  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 flex gap-2 bg-white dark:bg-slate-800 shadow-lg rounded-lg px-3 py-2 border">
      {/* Alignement horizontal */}
      <button aria-label="Aligner à gauche" onClick={() => alignHorizontal("left")} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><AlignLeft className="w-4 h-4" /></button>
      <button aria-label="Aligner au centre" onClick={() => alignHorizontal("center")} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><AlignCenter className="w-4 h-4" /></button>
      <button aria-label="Aligner à droite" onClick={() => alignHorizontal("right")} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><AlignRight className="w-4 h-4" /></button>

      {/* Alignement vertical */}
      <button aria-label="Aligner en haut" onClick={() => alignVertical("top")} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">⬆</button>
      <button aria-label="Aligner au milieu" onClick={() => alignVertical("middle")} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><AlignVerticalSpaceAround className="w-4 h-4" /></button>
      <button aria-label="Aligner en bas" onClick={() => alignVertical("bottom")} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">⬇</button>

      {/* Z-index */}
      <button aria-label="Amener au premier plan" onClick={bringToFront} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><BringToFront className="w-4 h-4" /></button>
      <button aria-label="Envoyer à l’arrière-plan" onClick={sendToBack} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><SendToBack className="w-4 h-4" /></button>

      {/* Duplicate / Delete */}
      <button aria-label="Dupliquer" onClick={duplicate} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><Copy className="w-4 h-4" /></button>
      <button aria-label="Supprimer" onClick={remove} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>

      {/* Group / Ungroup */}
      {selected.length > 1 && (
        <button aria-label="Grouper" onClick={groupSelection} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><Group className="w-4 h-4" /></button>
      )}
      {selected.some((c) => c.type === "group") && (
        <button aria-label="Dégrouper" onClick={ungroupSelection} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><Ungroup className="w-4 h-4" /></button>
      )}
    </div>
  );
}
