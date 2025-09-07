import { AlignLeft, AlignCenter, AlignRight, AlignVerticalSpaceAround, BringToFront, SendToBack, Copy, Trash2 } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { DroppedComponent } from "./LiveEditor";

interface SelectionToolbarProps {
  selected: DroppedComponent[];
  clearSelection: () => void;
}

export default function SelectionToolbar({ selected, clearSelection }: SelectionToolbarProps) {
  const { updateElements, getCurrentPage, saveSnapshot } = useAppStore();
  const page = getCurrentPage();
  if (!page || selected.length === 0) return null;

  // 🔥 Met à jour un ou plusieurs composants
  function applyUpdate(updateFn: (c: DroppedComponent) => DroppedComponent) {
    saveSnapshot();
    const newState = page.elements.map((c) =>
      selected.some((s) => s.id === c.id) ? updateFn(c) : c
    );
    updateElements(newState);
  }

  function alignHorizontal(pos: "left" | "center" | "right") {
    const parentWidth = 800; // ⚡ À remplacer par largeur du canvas
    applyUpdate((c) => {
      const { width = 100, x = 0, y = 0 } = c.props;
      let newX = x;
      if (pos === "left") newX = 0;
      if (pos === "center") newX = (parentWidth - width) / 2;
      if (pos === "right") newX = parentWidth - width;
      return { ...c, props: { ...c.props, x: newX, y } };
    });
  }

  function alignVertical(pos: "top" | "middle" | "bottom") {
    const parentHeight = 600; // ⚡ À remplacer par hauteur du canvas
    applyUpdate((c) => {
      const { height = 100, x = 0, y = 0 } = c.props;
      let newY = y;
      if (pos === "top") newY = 0;
      if (pos === "middle") newY = (parentHeight - height) / 2;
      if (pos === "bottom") newY = parentHeight - height;
      return { ...c, props: { ...c.props, y: newY, x } };
    });
  }

  function bringToFront() {
    applyUpdate((c) => ({ ...c, props: { ...c.props, zIndex: 9999 } }));
  }

  function sendToBack() {
    applyUpdate((c) => ({ ...c, props: { ...c.props, zIndex: 0 } }));
  }

  function duplicate() {
    if (!page) return;
    saveSnapshot();
    const clones = selected.map((c) => ({
      ...c,
      id: crypto.randomUUID(),
      props: { ...c.props, x: (c.props.x || 0) + 20, y: (c.props.y || 0) + 20 },
    }));
    updateElements([...page.elements, ...clones]);
  }

  function remove() {
    if (!page) return;
    saveSnapshot();
    updateElements(page.elements.filter((c) => !selected.some((s) => s.id === c.id)));
    clearSelection();
  }

  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 flex gap-2 bg-white dark:bg-slate-800 shadow-lg rounded-lg px-3 py-2 border">
      {/* Alignement horizontal */}
      <button onClick={() => alignHorizontal("left")} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><AlignLeft className="w-4 h-4" /></button>
      <button onClick={() => alignHorizontal("center")} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><AlignCenter className="w-4 h-4" /></button>
      <button onClick={() => alignHorizontal("right")} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><AlignRight className="w-4 h-4" /></button>

      {/* Alignement vertical */}
      <button onClick={() => alignVertical("top")} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">⬆</button>
      <button onClick={() => alignVertical("middle")} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><AlignVerticalSpaceAround className="w-4 h-4" /></button>
      <button onClick={() => alignVertical("bottom")} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">⬇</button>

      {/* Z-index */}
      <button onClick={bringToFront} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><BringToFront className="w-4 h-4" /></button>
      <button onClick={sendToBack} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><SendToBack className="w-4 h-4" /></button>

      {/* Duplicate / Delete */}
      <button onClick={duplicate} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><Copy className="w-4 h-4" /></button>
      <button onClick={remove} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
    </div>
  );
}