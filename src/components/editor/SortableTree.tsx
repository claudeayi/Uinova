import React, { useMemo } from "react";
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
import type { ElementData } from "../../store/useAppStore";

/**
 * Ce composant gère 3 zones de drop par item :
 *  - before  : insérer avant l'élément
 *  - after   : insérer après l'élément
 *  - into    : insérer comme enfant (uniquement si el.type === "group")
 *
 * On n'utilise PAS SortableContext ici pour garder un contrôle fin du "nesting".
 */

type Props = {
  elements: ElementData[];
  onSelect: (path: number[] | null) => void;
  onReorder: (next: ElementData[]) => void; // callback avec l'arbre mis à jour
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
    // Ajouter comme dernier enfant du target (path = chemin exact de l'élément cible)
    const target = getByPath(copy, path);
    target.children = target.children || [];
    target.children.push(node);
    return copy;
  }

  // "before" ou "after" => on insère dans le parent du target
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
  // Draggable bloc (ligne entière)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useDraggable({
    id: el.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  // 3 zones de drop : before / after / into (si group)
  const beforeId = `${el.id}__before`;
  const afterId = `${el.id}__after`;
  const intoId = `${el.id}__into`;

  const before = useDroppable({ id: beforeId });
  const after = useDroppable({ id: afterId });
  const into = el.type === "group" ? useDroppable({ id: intoId }) : null;

  // Cues visuels
  const line = "h-2 rounded bg-blue-500/40";
  const thin = "h-1 rounded bg-blue-500/40";
  const isOverInto = !!into?.isOver;

  return (
    <div style={{ marginLeft: (path.length - 1) * 12 }}>
      {/* Zone BEFORE (fine au-dessus) */}
      <div ref={before.setNodeRef} className={before.isOver ? line : "h-2"} />

      {/* Ligne principale draggable */}
      <div
        ref={setNodeRef}
        style={style}
        className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-grab select-none"
        onClick={() => onSelect(path)}
        {...attributes}
        {...listeners}
        title={`#${el.id.slice(0, 6)} • ${el.type}`}
      >
        <span className="text-xs text-gray-400">#{el.id.slice(0, 5)}</span>
        <span className="font-medium">{el.type}</span>
        {el.children && el.children.length > 0 && (
          <span className="text-xs opacity-70">({el.children.length})</span>
        )}
      </div>

      {/* Zone INTO (si group) */}
      {el.type === "group" && (
        <div
          ref={into!.setNodeRef}
          className={
            "ml-4 my-1 border-2 border-dashed rounded px-2 py-1 transition-colors " +
            (isOverInto ? "border-blue-500/70 bg-blue-50 dark:bg-blue-900/20" : "border-gray-300 dark:border-gray-700")
          }
        >
          <span className="text-[11px] opacity-70">Déposer ici pour imbriquer</span>
        </div>
      )}

      {/* Zone AFTER (fine en-dessous) */}
      <div ref={after.setNodeRef} className={after.isOver ? thin : "h-1"} />
    </div>
  );
}

export default function SortableTree({ elements, onSelect, onReorder }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const flat = useMemo(() => flatten(elements), [elements]);

  function byId(id: string): FlatNode | null {
    return flat.find((n) => n.el.id === id) || null;
  }

  function parseTarget(overId: string): { targetId: string; mode: "before" | "after" | "into" } | null {
    if (overId.endsWith("__before")) return { targetId: overId.replace("__before", ""), mode: "before" };
    if (overId.endsWith("__after")) return { targetId: overId.replace("__after", ""), mode: "after" };
    if (overId.endsWith("__into")) return { targetId: overId.replace("__into", ""), mode: "into" };
    // Si on tombe directement sur l'id (rare), on considère "before"
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

    // Empêcher de déposer un parent à l'intérieur de son propre descendant
    const draggedPathStr = dragged.path.join(".");
    const targetPathStr = target.path.join(".");
    if (drop.mode === "into" && targetPathStr.startsWith(draggedPathStr)) {
      return; // annule
    }

    // Retirer le noeud de sa position actuelle
    const [removed, treeWithout] = removeAtPath(elements, dragged.path);

    // Si "into" mais cible pas group (sécurité), rebasculer en "after"
    const isTargetGroup = target.el.type === "group";
    const mode: "before" | "after" | "into" = drop.mode === "into" && isTargetGroup ? "into" : drop.mode === "into" ? "after" : drop.mode;

    // Réinsérer
    const next = insertAtPath(treeWithout, target.path, removed, mode);
    onReorder(next);
  };

  return (
    <aside className="w-72 p-3 border-r bg-white dark:bg-gray-900">
      <div className="text-sm font-semibold mb-2">Arborescence</div>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        {flat.map(({ el, path }) => (
          <DraggableRow key={el.id} el={el} path={path} onSelect={onSelect} />
        ))}
      </DndContext>
    </aside>
  );
}
