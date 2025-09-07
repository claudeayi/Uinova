// src/components/editor/TreeView.tsx
import React, { useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ElementData } from "../../store/useAppStore";
import { Folder, Square } from "lucide-react";

type Props = {
  elements: ElementData[];
  onSelect: (path: number[] | null) => void;
  onReorder?: (next: ElementData[]) => void;
  selectedPath?: number[] | null;
};

function Row({
  el,
  path,
  onSelect,
  selected,
}: {
  el: ElementData;
  path: number[];
  onSelect: (path: number[]) => void;
  selected: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: el.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      role="treeitem"
      aria-selected={selected}
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect(path)}
      className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer select-none 
        ${selected ? "bg-blue-100 dark:bg-blue-900" : "hover:bg-gray-100 dark:hover:bg-gray-800"}
        `}
      onClick={() => onSelect(path)}
      {...attributes}
      {...listeners}
    >
      {el.children && el.children.length > 0 ? (
        <Folder className="w-4 h-4 text-yellow-500" />
      ) : (
        <Square className="w-3 h-3 text-gray-400" />
      )}
      <span className="font-medium text-gray-800 dark:text-gray-200">
        {el.type}
      </span>
      {el.children && el.children.length > 0 && (
        <span className="text-xs text-gray-400">({el.children.length})</span>
      )}
    </div>
  );
}

function flatten(
  elements: ElementData[],
  parentPath: number[] = []
): { el: ElementData; path: number[] }[] {
  let out: { el: ElementData; path: number[] }[] = [];
  elements.forEach((el, idx) => {
    const p = [...parentPath, idx];
    out.push({ el, path: p });
    if (el.children && el.children.length) {
      out = out.concat(flatten(el.children, p));
    }
  });
  return out;
}

export default function TreeView({
  elements,
  onSelect,
  onReorder,
  selectedPath,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const flat = useMemo(() => flatten(elements), [elements]);
  const ids = flat.map((n) => n.el.id);

  function byId(id: string): { el: ElementData; path: number[] } | null {
    return flat.find((n) => n.el.id === id) || null;
  }

  function removeAtPath(
    tree: ElementData[],
    path: number[]
  ): [ElementData, ElementData[]] {
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
    node: ElementData
  ): ElementData[] {
    const copy = structuredClone(tree) as ElementData[];
    if (path.length === 1) {
      copy.splice(path[0], 0, node);
      return copy;
    }
    const [h, ...r] = path;
    copy[h].children = insertAtPath(copy[h].children || [], r, node);
    return copy;
  }

  const handleDragEnd = (e: DragEndEvent) => {
    if (!onReorder) return;
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const a = byId(String(active.id));
    const b = byId(String(over.id));
    if (!a || !b) return;

    const [removed, treeWithout] = removeAtPath(elements, a.path);
    const insertPath = [...b.path];
    const next = insertAtPath(treeWithout, insertPath, removed);

    onReorder(next);
  };

  return (
    <aside className="w-72 h-full p-3 border-r dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col">
      <div className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
        🌳 Arborescence
      </div>

      {elements.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
          Aucun composant
        </div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            {flat.map(({ el, path }) => (
              <div
                key={el.id}
                style={{ marginLeft: (path.length - 1) * 12 }}
                className="relative"
              >
                <Row
                  el={el}
                  path={path}
                  onSelect={onSelect}
                  selected={
                    selectedPath &&
                    JSON.stringify(selectedPath) === JSON.stringify(path)
                  }
                />
              </div>
            ))}
          </SortableContext>
        </DndContext>
      )}
    </aside>
  );
}
