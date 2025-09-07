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
  Undo2,
  Redo2,
} from "lucide-react";
import toast from "react-hot-toast";
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
  const { updateElements, getCurrentPage, saveSnapshot, undo, redo } =
    useAppStore();
  const page = getCurrentPage();
  if (!page || selected.length === 0) return null;

  const canvasWidth = canvasRef?.current?.offsetWidth || 800;
  const canvasHeight = canvasRef?.current?.offsetHeight || 600;

  /* ------------------------------
     Utils
  ------------------------------ */
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
    toast.success(`Alignement horizontal : ${pos}`);
  }

  function alignVertical(pos: "top" | "middle" | "bottom") {
    applyUpdate((c) => {
