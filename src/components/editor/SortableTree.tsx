import React, { useMemo } from "react";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ElementData } from "../../store/useAppStore";

type Props = {
  elements: ElementData[];
  onSelect: (path: number[] | null) => void;
  onReorder: (next: ElementData[]) => void;
};

function Row({
  el,
  path,
  onSelect,
}: {
  el: ElementData;
  path: number[];
  onSelect: (path: number[]) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: el.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
      onClick={() => onSelect(path)}
      {...attributes}
      {...listeners}
    >
      <span className="text-xs text-gray-400">#{el.id.slice(0, 5)}</span>
      <span className="font-medium">{el.type}</span>
      {el.children && el.children.length > 0 && (
        <span className="text-xs opacity-70">({el.children.length})</span>
      )}
    </div>
  );
}

function flatten(elements: ElementData[], parentPath: number[] = []): { el: ElementData; path: number[] }[] {
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

export default function SortableTree({ elements, onSelect, onReorder }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const flat = useMemo(() => flatten(elements), [elements]);
  const ids = useMemo(() => flat.map((n) => n.el.id), [flat]);

  function byId(id: string): { el: ElementData; path: number[] } | null {
    return flat.find((n) => n.el.id === id) || null;
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

  function insertAtPath(tree: ElementData[], path: number[], node: ElementData): ElementData[] {
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
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const a = byId(String(active.id));
    const b = byId(String(over.id));
    if (!a || !b) return;

    const [removed, treeWithout] = removeAtPath(elements, a.path);

    // simple: réordonne au même niveau (entre frères), en insérant à la position de b
    const next = insertAtPath(treeWithout, b.path, removed);

    onReorder(next);
  };

  return (
    <aside className="w-72 p-3 border-r bg-white dark:bg-gray-900">
      <div className="text-sm font-semibold mb-2">Arborescence</div>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {flat.map(({ el, path }) => (
            <div key={el.id} style={{ marginLeft: (path.length - 1) * 12 }}>
              <Row el={el} path={path} onSelect={onSelect} />
            </div>
          ))}
        </SortableContext>
      </DndContext>
    </aside>
  );
}
