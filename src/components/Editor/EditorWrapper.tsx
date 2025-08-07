import { useEffect, useState } from "react";
import { DndContext, useDraggable, useDroppable } from "@dnd-kit/core";
import { v4 as uuid } from "uuid";
import FadeInCard from "../Common/FadeInCard";
import toast from "react-hot-toast";
import LivePreview from "./LivePreview";
import { useAppStore, ElementData } from "../../store/useAppStore";
import TreeView from "./TreeView";
import Inspector from "./Inspector";
import SectionLibrary from "./SectionLibrary";
import { toHTML, download } from "../../utils/exporters";

const palette = [
  { type: "button", label: "Button" },
  { type: "input", label: "Input" },
  { type: "card", label: "Card" },
  { type: "group", label: "Groupe" },
];

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
    <div ref={setNodeRef} className="min-h-[420px] bg-white dark:bg-gray-800 border rounded p-4 flex flex-col">
      {children}
    </div>
  );
}

function getByPath(tree: ElementData[], path: number[]): ElementData {
  if (path.length === 1) return tree[path[0]];
  const [h, ...r] = path;
  return getByPath((tree[h].children || []), r);
}

export default function EditorWrapper() {
  const { projects, currentProjectId, currentPageId, emitElements, listenElements } = useAppStore();
  const proj = projects.find(p => p.id === currentProjectId) || projects[0];
  const page = proj.pages.find(p => p.id === currentPageId) || proj.pages[0];

  const [selectedPath, setSelectedPath] = useState<number[] | null>(null);

  useEffect(() => {
    listenElements();
  }, [listenElements]);

  // Patch props d'un élément sélectionné
  function patchProps(path: number[], patch: Partial<ElementData["props"]>) {
    const updated = structuredClone(page.elements) as ElementData[];
    const el = getByPath(updated, path);
    el.props = { ...(el.props || {}), ...patch };
    emitElements(updated);
  }

  function addElementAtRoot(type: string, label: string) {
    emitElements([
      ...page.elements,
      { id: uuid(), type, props: { label }, children: type === "group" ? [] : undefined },
    ]);
    toast.success("Composant ajouté !");
  }

  function insertSection(el: ElementData) {
    emitElements([ ...page.elements, el ]);
    toast.success("Section insérée !");
  }

  return (
    <DndContext
      onDragEnd={(e) => {
        if (e.over && e.over.id === "canvas") {
          const comp = palette.find((p) => p.type === e.active.id);
          if (comp) addElementAtRoot(comp.type, comp.label);
        }
      }}
    >
      <div className="flex h-[calc(100vh-64px)]">
        {/* Colonne gauche : Library + Tree */}
        <div className="flex flex-col">
          <SectionLibrary onInsert={insertSection} />
          <TreeView elements={page.elements} onSelect={setSelectedPath} />
        </div>

        {/* Centre : Canvas + Preview + Actions */}
        <div className="flex-1 p-6 bg-gray-100 dark:bg-gray-900">
          <div className="flex items-center gap-3 mb-4">
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded"
              onClick={() => download("export.html", toHTML(page.elements))}
            >
              Export HTML
            </button>
            <a
              className="bg-gray-800 text-white px-4 py-2 rounded"
              href={`/preview/${proj.id}/${page.id}`}
              target="_blank"
            >
              Ouvrir Preview
            </a>
          </div>

          <LivePreview elements={page.elements} />

          {/* Palette légère en haut du Canvas (drag source) */}
          <div className="mb-3 flex gap-2">
            {palette.map((c) => (
              <DraggableItem key={c.type} id={c.type}>
                <FadeInCard>{c.label}</FadeInCard>
              </DraggableItem>
            ))}
          </div>

          <DroppableCanvas>
            {page.elements.map((el, idx) => (
              <div key={el.id} className="mb-2" onClick={() => setSelectedPath([idx])}>
                <FadeInCard>
                  {el.type === "button" && (
                    <button className="bg-blue-600 text-white px-3 py-1 rounded">{el.props?.label}</button>
                  )}
                  {el.type === "input" && (
                    <input className="border px-2 py-1 rounded" placeholder={el.props?.label} readOnly />
                  )}
                  {el.type === "card" && (
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded">{el.props?.label}</div>
                  )}
                  {el.type === "group" && (
                    <div className="p-2 border-2 border-dashed rounded">
                      <div className="font-semibold mb-1">{el.props?.label || "Groupe"}</div>
                      <div className="ml-2">
                        {(el.children || []).map((c, i) => (
                          <div key={c.id} onClick={(ev) => { ev.stopPropagation(); setSelectedPath([idx, i]); }}>
                            <FadeInCard>
                              {c.type === "button" && (
                                <button className="bg-blue-600 text-white px-3 py-1 rounded">{c.props?.label}</button>
                              )}
                              {c.type === "input" && (
                                <input className="border px-2 py-1 rounded" placeholder={c.props?.label} readOnly />
                              )}
                              {c.type === "card" && (
                                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded">{c.props?.label}</div>
                              )}
                            </FadeInCard>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </FadeInCard>
              </div>
            ))}
          </DroppableCanvas>
        </div>

        {/* Droite : Inspector */}
        <Inspector selectedPath={selectedPath} onPatchProps={(patch) => selectedPath && patchProps(selectedPath, patch)} />
      </div>
    </DndContext>
  );
}
