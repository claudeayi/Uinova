import { useState } from "react";
import { DndContext, useDraggable, useDroppable } from "@dnd-kit/core";
import { v4 as uuid } from "uuid";
import FadeInCard from "../Common/FadeInCard";
import toast from "react-hot-toast";
import LivePreview from "./LivePreview";
import { useAppStore, ElementData } from "../../store/useAppStore";

const palette = [
  { type: "button", label: "Button" },
  { type: "input", label: "Input" },
  { type: "card", label: "Card" },
  { type: "group", label: "Groupe" }
];

// ---- DRAG&DROP : Imbrication de niveau 1 (groupe) ----
function DraggableItem({ id, children }: any) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className="cursor-grab select-none">
      {children}
    </div>
  );
}

function DroppableCanvas({ children }: any) {
  const { setNodeRef } = useDroppable({ id: "canvas" });
  return (
    <div ref={setNodeRef} className="min-h-[300px] bg-white dark:bg-gray-800 border rounded p-4 flex flex-col">
      {children}
    </div>
  );
}

function renderElements(elements: ElementData[], onEdit: (idx: number[], el: ElementData) => void, parentIdx: number[] = []) {
  return elements.map((el, idx) => {
    const path = [...parentIdx, idx];
    if (el.type === "group") {
      return (
        <FadeInCard key={el.id}>
          <div className="border-2 border-dashed p-2 rounded mb-2">
            <div className="font-semibold mb-1">{el.props.label || "Groupe"}</div>
            <div className="ml-2">
              {renderElements(el.children || [], onEdit, path)}
              <button className="text-xs text-blue-500 mt-2" onClick={() => onEdit(path, el)}>Ajouter un élément</button>
            </div>
          </div>
        </FadeInCard>
      );
    }
    if (el.type === "button") return (
      <FadeInCard key={el.id}>
        <button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={() => onEdit(path, el)}>{el.props.label}</button>
      </FadeInCard>
    );
    if (el.type === "input") return (
      <FadeInCard key={el.id}>
        <input className="border px-2 py-1 rounded" placeholder={el.props.label} onClick={() => onEdit(path, el)} readOnly />
      </FadeInCard>
    );
    if (el.type === "card") return (
      <FadeInCard key={el.id}>
        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded" onClick={() => onEdit(path, el)}>{el.props.label}</div>
      </FadeInCard>
    );
    return null;
  });
}

export default function EditorWrapper() {
  const { pages, currentPageId, updateElements, saveSnapshot, undo } = useAppStore();
  const page = pages.find(p => p.id === currentPageId) || pages[0];
  const [editPath, setEditPath] = useState<number[] | null>(null);

  // ---- Export HTML ----
  function exportHTML(elements: ElementData[]) {
    let html = elements.map(el => {
      if (el.type === "button") return `<button>${el.props.label}</button>`;
      if (el.type === "input") return `<input placeholder="${el.props.label}" />`;
      if (el.type === "card") return `<div>${el.props.label}</div>`;
      if (el.type === "group") return `<div>${exportHTML(el.children || [])}</div>`;
      return "";
    }).join("");
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "export.html";
    a.click();
    URL.revokeObjectURL(url);
  }

  // ---- Export Flutter (exemple simple) ----
  function exportFlutter(elements: ElementData[]): string {
    return elements.map(el => {
      if (el.type === "button") return `ElevatedButton(onPressed: () {}, child: Text('${el.props.label}')),`;
      if (el.type === "input") return `TextField(decoration: InputDecoration(hintText: '${el.props.label}')),`;
      if (el.type === "card") return `Card(child: Text('${el.props.label}')),`;
      if (el.type === "group") return `Column(children: [${exportFlutter(el.children || [])}]),`;
      return "";
    }).join("");
  }

  // ---- Ajout d’élément dans un groupe ----
  function addElementAtPath(path: number[], newEl: ElementData) {
    function addToTree(tree: ElementData[], idx: number[]): ElementData[] {
      if (idx.length === 0) return [...tree, newEl];
      const [head, ...rest] = idx;
      return tree.map((el, i) => {
        if (i !== head) return el;
        return { ...el, children: addToTree(el.children || [], rest) };
      });
    }
    updateElements(addToTree(page.elements, path));
  }

  // ---- Édition élément ----
  function handleEdit(path: number[], el: ElementData) {
    setEditPath(path);
  }

  // ---- Undo (versionning) ----
  function handleUndo() {
    undo();
    toast.success("Annulation !");
  }

  return (
    <DndContext
      onDragEnd={e => {
        if (e.over && e.over.id === "canvas") {
          const comp = palette.find(p => p.type === e.active.id);
          if (comp) {
            saveSnapshot();
            updateElements([...page.elements, { type: comp.type, props: { label: comp.label }, id: uuid(), children: comp.type === "group" ? [] : undefined }]);
            toast.success("Composant ajouté !");
          }
        }
      }}
    >
      <div className="flex">
        <div className="w-64 p-4 border-r bg-gray-50 dark:bg-gray-900">
          <h3 className="text-lg font-bold mb-2">Composants</h3>
          {palette.map(c =>
            <DraggableItem key={c.type} id={c.type}>
              <FadeInCard>{c.label}</FadeInCard>
            </DraggableItem>
          )}
          <button className="mt-6 bg-yellow-500 text-white px-4 py-2 rounded" onClick={handleUndo}>
            Annuler
          </button>
        </div>
        <div className="flex-1 p-6 bg-gray-100 dark:bg-gray-900">
          <LivePreview elements={page.elements} />
          <div className="flex gap-4 mt-4">
            <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={() => exportHTML(page.elements)}>Export HTML</button>
            <button className="bg-green-600 text-white px-4 py-2 rounded"
              onClick={() => {
                const code = exportFlutter(page.elements);
                const blob = new Blob([code], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = "export.dart";
                a.click();
                URL.revokeObjectURL(url);
              }}>Export Flutter</button>
          </div>
          <DroppableCanvas>
            {renderElements(page.elements, (idx, el) => setEditPath(idx))}
          </DroppableCanvas>
        </div>
      </div>

      {/* Modale d'édition */}
      {editPath !== null && (() => {
        // Retrouve l'élément à éditer dans l'arbre
        function getElementByPath(tree: ElementData[], idx: number[]): ElementData {
          if (idx.length === 1) return tree[idx[0]];
          const [head, ...rest] = idx;
          return getElementByPath(tree[head].children || [], rest);
        }
        const el = getElementByPath(page.elements, editPath);

        function updateLabel(newLabel: string) {
          function updateTree(tree: ElementData[], idx: number[]): ElementData[] {
            if (idx.length === 1) {
              return tree.map((e, i) => i === idx[0] ? { ...e, props: { ...e.props, label: newLabel } } : e);
            }
            const [head, ...rest] = idx;
            return tree.map((e, i) =>
              i === head
                ? { ...e, children: updateTree(e.children || [], rest) }
                : e
            );
          }
          updateElements(updateTree(page.elements, editPath));
        }

        return (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white dark:bg-gray-900 p-8 rounded shadow">
              <input
                className="border p-2 mb-4 w-full rounded"
                value={el.props.label}
                onChange={e => updateLabel(e.target.value)}
              />
              <button className="bg-blue-600 text-white px-4 py-2 rounded mr-2"
                onClick={() => setEditPath(null)}>
                Valider
              </button>
              <button onClick={() => setEditPath(null)} className="ml-2">Annuler</button>
            </div>
          </div>
        );
      })()}
    </DndContext>
  );
}
