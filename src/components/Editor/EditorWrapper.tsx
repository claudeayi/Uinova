import { useEffect, useMemo, useState } from "react";
import { DndContext, useDraggable, useDroppable } from "@dnd-kit/core";
import { v4 as uuid } from "uuid";
import toast, { Toaster } from "react-hot-toast";
import { useHotkeys } from "react-hotkeys-hook";

import LivePreview from "./LivePreview";
import TreeView from "./TreeView";
import Inspector from "./Inspector";
import SectionLibrary from "./SectionLibrary";
import ImportExportModal from "./ImportExportModal";
import ToolbarPro from "./ToolbarPro";

import { useAppStore, ElementData } from "../../store/useAppStore";
import { download, generateHTMLWithResolver, generateZip } from "../../utils/exporters"; // ✅
import { useCMS } from "../../store/useCMS"; // ✅

/* ---------------------------
 * Drag helpers
 * --------------------------- */
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

/* ---------------------------
 * Data helpers (path utils)
 * --------------------------- */
function getByPath(tree: ElementData[], path: number[]): ElementData {
  if (path.length === 1) return tree[path[0]];
  const [h, ...r] = path;
  return getByPath((tree[h].children || []), r);
}

function removeByPath(tree: ElementData[], path: number[]): ElementData[] {
  const copy = structuredClone(tree) as ElementData[];
  if (path.length === 1) {
    copy.splice(path[0], 1);
    return copy;
  }
  const [h, ...r] = path;
  copy[h].children = removeByPath(copy[h].children || [], r);
  return copy;
}

function cloneWithNewIds(node: ElementData): ElementData {
  const cloned: ElementData = structuredClone(node);
  const reassign = (n: ElementData) => {
    n.id = uuid();
    if (n.children && n.children.length) n.children.forEach(reassign);
  };
  reassign(cloned);
  return cloned;
}

/* ---------------------------
 * Palette
 * --------------------------- */
const palette = [
  { type: "button", label: "Button" },
  { type: "input", label: "Input" },
  { type: "card", label: "Card" },
  { type: "group", label: "Groupe" },
];

export default function EditorWrapper() {
  const {
    projects,
    currentProjectId,
    currentPageId,
    emitElements,
    listenElements,
    saveSnapshot,
    undo,
    redo,
  } = useAppStore();

  const { getItems } = useCMS(); // ✅ resolver CMS

  const proj = useMemo(
    () => projects.find((p) => p.id === currentProjectId) || projects[0],
    [projects, currentProjectId]
  );
  const page = useMemo(
    () => proj.pages.find((p) => p.id === currentPageId) || proj.pages[0],
    [proj, currentPageId]
  );

  const [selectedPath, setSelectedPath] = useState<number[] | null>(null);
  const [showImportExport, setShowImportExport] = useState(false);
  const [zipLoading, setZipLoading] = useState(false); // ✅

  useEffect(() => { listenElements(); }, [listenElements]);

  const canUndo = (page?.history?.length || 0) > 1;
  const canRedo = (page?.future?.length || 0) > 0;
  const hasSelection = !!selectedPath;

  function applyElements(next: ElementData[], msg?: string) {
    try {
      if (saveSnapshot) saveSnapshot();
      emitElements(next);
      if (msg) toast.success(msg);
    } catch (e) {
      toast.error("Une erreur est survenue");
      console.error(e);
    }
  }

  function patchProps(path: number[], patch: Partial<ElementData["props"]>) {
    const updated = structuredClone(page.elements) as ElementData[];
    const el = getByPath(updated, path);
    el.props = { ...(el.props || {}), ...patch };
    applyElements(updated);
  }

  function addElementAtRoot(type: string, label: string) {
    applyElements(
      [
        ...page.elements,
        { id: uuid(), type, props: { label }, children: type === "group" ? [] : undefined },
      ],
      "Composant ajouté !"
    );
  }

  function insertSection(el: ElementData) {
    applyElements([...page.elements, el], "Section insérée !");
  }

  function handleUndo() { if (undo) undo(); }
  function handleRedo() { if (redo) redo(); }

  function handleDuplicate() {
    if (!selectedPath) return;
    const node = getByPath(page.elements, selectedPath);
    const duplicated = cloneWithNewIds(node);

    const updated = structuredClone(page.elements) as ElementData[];
    if (selectedPath.length === 1) {
      updated.splice(selectedPath[0] + 1, 0, duplicated);
    } else {
      const parentPath = selectedPath.slice(0, -1);
      const idx = selectedPath[selectedPath.length - 1];
      const parent = getByPath(updated, parentPath);
      parent.children = parent.children || [];
      parent.children.splice(idx + 1, 0, duplicated);
    }
    applyElements(updated, "Élément dupliqué");
  }

  function handleDelete() {
    if (!selectedPath) return;
    const updated = removeByPath(page.elements, selectedPath);
    applyElements(updated, "Élément supprimé");
    setSelectedPath(null);
  }

  function handlePreview() {
    window.open(`/preview/${proj.id}/${page.id}`, "_blank", "noopener,noreferrer");
  }

  // ✅ Export HTML AVEC binding CMS
  function handleExportHTML() {
    const resolver = ({ collectionId, field }: { collectionId: string; field: string }) => {
      const items = getItems(collectionId);
      return items.length ? items[0]?.[field] ?? null : null;
    };
    const html = generateHTMLWithResolver(page.elements, resolver);
    download(`${page.name || "page"}.html`, html, "text/html;charset=utf-8");
    toast.success("Export HTML (avec données CMS) généré");
  }

  // ✅ Export ZIP AVEC binding CMS
  async function handleExportZip() {
    try {
      setZipLoading(true);
      const resolver = ({ collectionId, field }: { collectionId: string; field: string }) => {
        const items = getItems(collectionId);
        return items.length ? items[0]?.[field] ?? null : null;
      };
      const blob = await generateZip(page.elements, resolver);
      download(`${page.name || "export"}.zip`, blob, "application/zip");
      toast.success("Export ZIP généré");
    } catch (e) {
      console.error(e);
      toast.error("Échec de l’export ZIP");
    } finally {
      setZipLoading(false);
    }
  }

  const paletteView = (
    <div className="mb-3 flex gap-2">
      {palette.map((c) => (
        <DraggableItem key={c.type} id={c.type}>
          <div className="px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded shadow">{c.label}</div>
        </DraggableItem>
      ))}
    </div>
  );

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
          <ToolbarPro
            canUndo={canUndo}
            canRedo={canRedo}
            hasSelection={hasSelection}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onPreview={handlePreview}
            onExportHTML={handleExportHTML}
            onExportZip={handleExportZip}     // ✅ nouveau
            zipLoading={zipLoading}           // ✅ nouveau
            onOpenImportExport={() => setShowImportExport(true)}
          />

          <LivePreview elements={page.elements} />
          {paletteView}

          <DroppableCanvas>
            {page.elements.map((el, idx) => (
              <div key={el.id} className="mb-2" onClick={() => setSelectedPath([idx])}>
                <div className="bg-white dark:bg-gray-800 border rounded p-2">
                  {el.type === "button" && (
                    <button className="bg-blue-600 text-white px-3 py-1 rounded">
                      {el.props?.label}
                    </button>
                  )}
                  {el.type === "input" && (
                    <input
                      className="border px-2 py-1 rounded"
                      placeholder={el.props?.label}
                      readOnly
                    />
                  )}
                  {el.type === "card" && (
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded">
                      {el.props?.label}
                    </div>
                  )}
                  {el.type === "group" && (
                    <div className="p-2 border-2 border-dashed rounded">
                      <div className="font-semibold mb-1">
                        {el.props?.label || "Groupe"}
                      </div>
                      <div className="ml-2">
                        {(el.children || []).map((c, i) => (
                          <div
                            key={c.id}
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setSelectedPath([idx, i]);
                            }}
                          >
                            <div className="bg-white dark:bg-gray-700 rounded p-2 mt-1">
                              {c.type === "button" && (
                                <button className="bg-blue-600 text-white px-3 py-1 rounded">
                                  {c.props?.label}
                                </button>
                              )}
                              {c.type === "input" && (
                                <input
                                  className="border px-2 py-1 rounded"
                                  placeholder={c.props?.label}
                                  readOnly
                                />
                              )}
                              {c.type === "card" && (
                                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded">
                                  {c.props?.label}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </DroppableCanvas>
        </div>

        {/* Droite : Inspector */}
        <Inspector
          selectedPath={selectedPath}
          onPatchProps={(patch) => selectedPath && patchProps(selectedPath, patch)}
        />

        {showImportExport && <ImportExportModal onClose={() => setShowImportExport(false)} />}
      </div>

      <Toaster position="top-right" />
    </DndContext>
  );
}
