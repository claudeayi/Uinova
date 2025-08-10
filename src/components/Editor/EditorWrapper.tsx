// src/components/editor/EditorWrapper.tsx
import { useEffect, useMemo, useState } from "react";
import { DndContext, useDraggable, useDroppable } from "@dnd-kit/core";
import { v4 as uuid } from "uuid";
import toast, { Toaster } from "react-hot-toast";
import { useHotkeys } from "react-hotkeys-hook";

import SortableTree from "./SortableTree";            // ✅ tree DnD avec nesting
import Inspector from "./Inspector";
import SectionLibrary from "./SectionLibrary";
import ImportExportModal from "./ImportExportModal";
import ToolbarPro from "./ToolbarPro";
import PresenceBar from "./PresenceBar";             // ✅ présence
import LivePreview from "./LivePreview";             // ✅ preview
import { PRO_PALETTE } from "./ProPalette";          // ✅ palette étendue
import { renderNode } from "./renderers";            // ✅ rendu unifié

import { useAppStore, ElementData } from "../../store/useAppStore";
import {
  download,
  generateHTMLWithResolver,
  generateZip,
  generateProjectZip,
} from "../../utils/exporters";
import { debounce } from "../../utils/debounce";     // ✅ autosave
import { saveDraft, loadDraft } from "../../utils/autosave";
import { useCMS } from "../../store/useCMS";

/* ---------------------------
 * Drag helpers
 * --------------------------- */
function DraggableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className="cursor-grab select-none">
      {children}
    </div>
  );
}

function DroppableCanvas({ children }: { children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id: "canvas" });
  return (
    <div ref={setNodeRef} className="min-h-[420px] bg-white dark:bg-gray-800 border rounded p-4 flex flex-col">
      {children}
    </div>
  );
}

/* ---------------------------
 * Path utils
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
 * Éditeur
 * --------------------------- */
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

  const cms = useCMS(); // peut contenir getItems OU getCollection selon ta version

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
  const [zipLoading, setZipLoading] = useState(false);
  const [siteLoading, setSiteLoading] = useState(false);

  /* ========= Collaboration (écoute live) ========= */
  useEffect(() => {
    listenElements();
  }, [listenElements]);

  /* ========= Autosave: restore au 1er montage de la page ========= */
  useEffect(() => {
    if (!proj || !page) return;
    const draft = loadDraft(proj.id, page.id);
    if (draft && Array.isArray(draft) && draft.length) {
      emitElements(draft);
      toast.success("Brouillon restauré");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proj?.id, page?.id]);

  /* ========= Autosave: sauvegarde debouncée à chaque changement ========= */
  const debouncedSave = useMemo(
    () =>
      debounce((elements: ElementData[]) => {
        if (!proj || !page) return;
        saveDraft(proj.id, page.id, elements);
      }, 500),
    [proj?.id, page?.id]
  );
  useEffect(() => {
    if (page?.elements) debouncedSave(page.elements);
  }, [page?.elements, debouncedSave]);

  /* ========= Indicateurs Toolbar ========= */
  const canUndo = (page?.history?.length || 0) > 1;
  const canRedo = (page?.future?.length || 0) > 0;
  const hasSelection = !!selectedPath;

  /* ========= Mutations (snapshot + broadcast + autosave imméd.) ========= */
  function applyElements(next: ElementData[], msg?: string) {
    try {
      if (saveSnapshot) saveSnapshot();
      emitElements(next);
      if (proj && page) saveDraft(proj.id, page.id, next); // ✅ autosave immédiat
      if (msg) toast.success(msg);
    } catch (e) {
      toast.error("Une erreur est survenue");
      console.error(e);
    }
  }

  /* ========= Patch props ========= */
  function patchProps(path: number[], patch: Partial<ElementData["props"]>) {
    const updated = structuredClone(page.elements) as ElementData[];
    const el = getByPath(updated, path);
    el.props = { ...(el.props || {}), ...patch };
    applyElements(updated);
  }

  /* ========= Insertions ========= */
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

  /* ========= Actions Pro (Undo/Redo/Duplicate/Delete) ========= */
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

  /* ========= Export / Preview ========= */
  function handlePreview() {
    window.open(`/preview/${proj.id}/${page.id}`, "_blank", "noopener,noreferrer");
  }

  // Résolveur CMS robuste (supporte getItems OU getCollection)
  const cmsResolver = ({ collectionId, field }: { collectionId: string; field: string }) => {
    const items =
      // @ts-ignore — selon ta version du store
      typeof cms.getItems === "function"
        ? cms.getItems(collectionId)
        : cms.getCollection
        ? (cms.getCollection(collectionId)?.items ?? [])
        : [];
    return items.length ? items[0]?.[field] ?? null : null;
  };

  // HTML (avec binding CMS)
  function handleExportHTML() {
    const html = generateHTMLWithResolver(page.elements, cmsResolver);
    download(`${page.name || "page"}.html`, html, "text/html;charset=utf-8");
    toast.success("Export HTML (avec données CMS) généré");
  }

  // ZIP (page courante)
  async function handleExportZip() {
    try {
      setZipLoading(true);
      const blob = await generateZip(page.elements, cmsResolver);
      download(`${page.name || "export"}.zip`, blob, "application/zip");
      toast.success("Export ZIP généré");
    } catch (e) {
      console.error(e);
      toast.error("Échec de l’export ZIP");
    } finally {
      setZipLoading(false);
    }
  }

  // Site (multi-pages)
  async function handleExportSite() {
    try {
      setSiteLoading(true);

      const projectPayload = {
        id: proj.id,
        name: proj.name,
        pages: proj.pages.map((p) => ({
          id: p.id,
          name: p.name,
          elements: p.elements,
        })),
      };

      const blob = await generateProjectZip(projectPayload, cmsResolver);
      download(`${proj.name || "uinova-site"}.zip`, blob, "application/zip");
      toast.success("Export du site (multi-pages) généré");
    } catch (e) {
      console.error(e);
      toast.error("Échec de l’export du site");
    } finally {
      setSiteLoading(false);
    }
  }

  /* ========= Raccourcis pro ========= */
  useHotkeys("ctrl+z, cmd+z", (e) => { e.preventDefault(); handleUndo(); }, {}, [page?.history]);
  useHotkeys("ctrl+y, cmd+y, ctrl+shift+z, cmd+shift+z", (e) => { e.preventDefault(); handleRedo(); }, {}, [page?.future]);
  useHotkeys("ctrl+d, cmd+d", (e) => { e.preventDefault(); if (selectedPath) handleDuplicate(); }, {}, [selectedPath, page?.elements]);
  useHotkeys("del, backspace", (e) => { if (selectedPath) { e.preventDefault(); handleDelete(); } }, {}, [selectedPath, page?.elements]);

  // Palette PRO
  const paletteView = (
    <div className="mb-3 flex gap-2 flex-wrap">
      {PRO_PALETTE.map((c) => (
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
          const comp = PRO_PALETTE.find((p) => p.type === e.active.id);
          if (comp) addElementAtRoot(comp.type, comp.label);
        }
      }}
    >
      <div className="flex h-[calc(100vh-64px)]">
        {/* Colonne gauche : Library + Tree */}
        <div className="flex flex-col">
          <SectionLibrary onInsert={insertSection} />
          <SortableTree
            elements={page.elements}
            onSelect={setSelectedPath}
            onReorder={(next) => applyElements(next, "Arborescence réordonnée")} // ✅ tri + nesting
          />
        </div>

        {/* Centre : Canvas + Preview + Actions */}
        <div className="flex-1 p-6 bg-gray-100 dark:bg-gray-900">
          {/* ✅ Présence utilisateurs */}
          <PresenceBar />

          {/* ✅ Toolbar Pro */}
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
            onExportZip={handleExportZip}
            zipLoading={zipLoading}
            onExportSite={handleExportSite}
            siteLoading={siteLoading}
            onOpenImportExport={() => setShowImportExport(true)}
          />

          {/* ✅ Live Preview */}
          <LivePreview elements={page.elements} />

          {/* ✅ Palette drag source */}
          {paletteView}

          {/* ✅ Canvas */}
          <DroppableCanvas>
            {page.elements.map((el, idx) => (
              <div key={el.id} className="mb-2" onClick={() => setSelectedPath([idx])}>
                <div className="bg-white dark:bg-gray-800 border rounded p-2">
                  {renderNode(el)}
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

        {/* Modale import/export */}
        {showImportExport && (
          <ImportExportModal onClose={() => setShowImportExport(false)} />
        )}
      </div>

      {/* Toasts globaux */}
      <Toaster position="top-right" />
    </DndContext>
  );
}
