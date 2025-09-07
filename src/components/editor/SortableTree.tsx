// src/components/editor/SortableTree.tsx
import React, { useMemo, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Folder, Square } from "lucide-react";
import type { ElementData } from "../../store/useAppStore";

/**
 * Gestion fine du nesting avec zones before/after/into
 */

type Props = {
  elements: ElementData[];
  onSelect: (path: number[] | null) => void;
  onReorder: (next: ElementData[]) => void;
};

type FlatNode = { el: ElementData; path: number[] };

function flatten(elements: ElementData[], parentPath: number[] = []): FlatNode[] {
  let out: FlatNode[] = [];
  elements.forEach((el, idx) => {
    const p = [...parentPath, idx];
    out.push({ el, path: p });
    if (el.children && el.children.length) {
      out = out.concat(flatten(el.children, p));
    }
  });
  return out;
}

function getByPath(tree: ElementData[], path: number[]): ElementData {
  if (path.length === 1) return tree[path[0]];
  const [h, ...r] = path;
  return getByPath((tree[h].children || []), r);
}

function removeAtPath(tree: ElementData[], path: number[]): [ElementData, ElementData[]] {
  const copy = structuredClone(tree) as ElementData[];
  if (path.length === 1) {
    const [removed] = copy.splice(path[0], 1);
    return [removed, copy];
  }
  const [h, ...r] = path;
  const [removed, newChildren] = removeAtPath(copy[h].children || [], r);
  copy[h].children = newChildren;
  return [removed, copy];
}

function insertAtPath(
  tree: ElementData[],
  path: number[],
  node: ElementData,
  mode: "before" | "after" | "into"
): ElementData[] {
  const copy = structuredClone(tree) as ElementData[];

  if (mode === "into") {
    const target = getByPath(copy, path);
    target.children = target.children || [];
    target.children.push(node);
    return copy;
  }

  if (path.length === 1) {
    const idx = path[0];
    const at = mode === "before" ? idx : idx + 1;
    copy.splice(at, 0, node);
    return copy;
  }
  const [h, ...r] = path;
  const parent = copy[h];
  parent.children = parent.children || [];
  const idx = r[0];
  const at = mode === "before" ? idx : idx + 1;
  parent.children.splice(at, 0, node);
  return copy;
}

/* ---------------------------
 * Draggable + Drop zones
 * --------------------------- */
function DraggableRow({
  el,
  path,
  onSelect,
}: {
  el: ElementData;
  path: number[];
  onSelect: (path: number[]) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useDraggable({ id: el.id });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const before = useDroppable({ id: `${el.id}__before` });
  const after = useDroppable({ id: `${el.id}__after` });
  const into = el.type === "group" ? useDroppable({ id: `${el.id}__into` }) : null;

  return (
    <div style={{ marginLeft: (path.length - 1) * 14 }}>
      {/* Zone BEFORE */}
      <div ref={before.setNodeRef} className={before.isOver ? "h-2 bg-blue-500/50 rounded" : "h-2"} />

      {/* Ligne principale draggable */}
      <div
        ref={setNodeRef}
        style={style}
        className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-grab select-none transition"
        onClick={() => onSelect(path)}
        role="treeitem"
        {...attributes}
        {...listeners}
        title={`#${el.id.slice(0, 6)} • ${el.type}`}
      >
        {el.type === "group" ? (
          <Folder className="w-4 h-4 text-blue-500" />
        ) : (
          <Square className="w-3 h-3 text-gray-400" />
        )}
        <span className="font-medium">{el.type}</span>
        {el.children?.length ? (
          <span className="text-xs opacity-60">({el.children.length})</span>
        ) : null}
      </div>

      {/* Zone INTO */}
      {el.type === "group" && (
        <div
          ref={into!.setNodeRef}
          className={`ml-5 my-1 border-2 border-dashed rounded px-2 py-1 text-[11px] transition-colors ${
            into?.isOver
              ? "border-blue-500/70 bg-blue-50 dark:bg-blue-900/20"
              : "border-gray-300 dark:border-gray-700 text-gray-400"
          }`}
        >
          Déposer ici
        </div>
      )}

      {/* Zone AFTER */}
      <div ref={after.setNodeRef} className={after.isOver ? "h-1 bg-blue-500/40 rounded" : "h-1"} />
    </div>
  );
}

/* ---------------------------
 * SortableTree principal
 * --------------------------- */
export default function SortableTree({ elements, onSelect, onReorder }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );
  const flat = useMemo(() => flatten(elements), [elements]);

  const byId = useCallback(
    (id: string): FlatNode | null => flat.find((n) => n.el.id === id) || null,
    [flat]
  );

  function parseTarget(overId: string): { targetId: string; mode: "before" | "after" | "into" } | null {
    if (overId.endsWith("__before")) return { targetId: overId.replace("__before", ""), mode: "before" };
    if (overId.endsWith("__after")) return { targetId: overId.replace("__after", ""), mode: "after" };
    if (overId.endsWith("__into")) return { targetId: overId.replace("__into", ""), mode: "into" };
    return { targetId: overId, mode: "before" };
  }

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over) return;
    const dragId = String(active.id);
    const drop = parseTarget(String(over.id));
    if (!drop) return;

    const dragged = byId(dragId);
    const target = byId(drop.targetId);
    if (!dragged || !target) return;

    const draggedPathStr = dragged.path.join(".");
    const targetPathStr = target.path.join(".");
    if (drop.mode === "into" && targetPathStr.startsWith(draggedPathStr)) {
      console.warn("⚠️ Tentative de drop dans descendant annulée");
      return;
    }

    const [removed, treeWithout] = removeAtPath(elements, dragged.path);
    const isTargetGroup = target.el.type === "group";
    const mode =
      drop.mode === "into" && isTargetGroup ? "into" : drop.mode === "into" ? "after" : drop.mode;

    const next = insertAtPath(treeWithout, target.path, removed, mode);
    onReorder(next);
  };

  return (
    <aside
      className="w-72 p-3 border-r bg-white dark:bg-gray-900"
      role="tree"
      aria-label="Arborescence des composants"
    >
      <div className="text-sm font-semibold mb-2">Arborescence</div>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        {flat.map(({ el, path }) => (
          <DraggableRow key={el.id} el={el} path={path} onSelect={onSelect} />
        ))}
      </DndContext>
    </aside>
  );
}
