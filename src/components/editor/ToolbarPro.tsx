// src/components/editor/ToolbarPro.tsx
import React from "react";
import {
  Undo2,
  Redo2,
  Copy,
  Trash2,
  Eye,
  FileDown,
  Package,
  Globe,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { cn } from "@/utils/cn";

type Props = {
  canUndo?: boolean;
  canRedo?: boolean;
  hasSelection?: boolean;

  onUndo: () => void;
  onRedo: () => void;
  onDuplicate: () => void;
  onDelete: () => void;

  onPreview: () => void;
  onExportHTML: () => void;

  onOpenImportExport?: () => void;

  onExportZip?: () => void;
  zipLoading?: boolean;

  onExportSite?: () => void;
  siteLoading?: boolean;
};

export default function ToolbarPro({
  canUndo = false,
  canRedo = false,
  hasSelection = false,
  onUndo,
  onRedo,
  onDuplicate,
  onDelete,
  onPreview,
  onExportHTML,
  onOpenImportExport,
  onExportZip,
  zipLoading = false,
  onExportSite,
  siteLoading = false,
}: Props) {
  const baseBtn =
    "inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition border shadow-sm";
  const activeStyle =
    "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200";
  const disabledStyle = "opacity-50 cursor-not-allowed";
  const sepStyle = "w-px h-6 bg-slate-300 dark:bg-slate-700 mx-1";

  return (
    <div
      className="flex flex-wrap items-center gap-2 p-2 mb-4 border rounded-md bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
      role="toolbar"
      aria-label="Barre d'outils UInova"
    >
      {/* Undo / Redo */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        aria-disabled={!canUndo}
        aria-label="Annuler"
        className={cn(baseBtn, activeStyle, !canUndo && disabledStyle)}
        title="Annuler (Ctrl/Cmd + Z)"
      >
        <Undo2 className="w-4 h-4" /> Undo
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        aria-disabled={!canRedo}
        aria-label="Rétablir"
        className={cn(baseBtn, activeStyle, !canRedo && disabledStyle)}
        title="Rétablir (Ctrl/Cmd + Y)"
      >
        <Redo2 className="w-4 h-4" /> Redo
      </button>

      <div className={sepStyle} />

      {/* Dupliquer / Supprimer */}
      <button
        onClick={onDuplicate}
        disabled={!hasSelection}
        className={cn(baseBtn, activeStyle, !hasSelection && disabledStyle)}
        aria-label="Dupliquer"
        title="Dupliquer (Ctrl/Cmd + D)"
      >
        <Copy className="w-4 h-4" /> Dupliquer
      </button>
      <button
        onClick={onDelete}
        disabled={!hasSelection}
        className={cn(baseBtn, activeStyle, !hasSelection && disabledStyle)}
        aria-label="Supprimer"
        title="Supprimer (Del)"
      >
        <Trash2 className="w-4 h-4" /> Supprimer
      </button>

      <div className={sepStyle} />

      {/* Aperçu */}
      <button
        onClick={onPreview}
        className={cn(baseBtn, activeStyle)}
        aria-label="Aperçu"
        title="Aperçu live"
      >
        <Eye className="w-4 h-4" /> Aperçu
      </button>

      {/* Export HTML */}
      <button
        onClick={onExportHTML}
        className={cn(baseBtn, activeStyle)}
        aria-label="Exporter HTML"
        title="Exporter en HTML (avec CMS)"
      >
        <FileDown className="w-4 h-4" /> Export HTML
      </button>

      {/* Export ZIP */}
      {onExportZip && (
        <button
          onClick={onExportZip}
          disabled={zipLoading}
          aria-busy={zipLoading}
          className={cn(baseBtn, activeStyle, zipLoading && disabledStyle)}
          aria-label="Exporter ZIP"
          title="ZIP (multi-format)"
        >
          {zipLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> ZIP…
            </>
          ) : (
            <>
              <Package className="w-4 h-4" /> Export ZIP
            </>
          )}
        </button>
      )}

      {/* Export Site */}
      {onExportSite && (
        <button
          onClick={onExportSite}
          disabled={siteLoading}
          aria-busy={siteLoading}
          className={cn(baseBtn, activeStyle, siteLoading && disabledStyle)}
          aria-label="Exporter Site"
          title="Exporter le site (multi-pages)"
        >
          {siteLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Site…
            </>
          ) : (
            <>
              <Globe className="w-4 h-4" /> Export Site
            </>
          )}
        </button>
      )}

      {/* Import/Export JSON */}
      {onOpenImportExport && (
        <>
          <div className={sepStyle} />
          <button
            onClick={onOpenImportExport}
            className={cn(baseBtn, activeStyle)}
            aria-label="Importer / Exporter"
            title="Importer / Exporter (JSON, ZIP)"
          >
            <RefreshCw className="w-4 h-4" /> Import/Export
          </button>
        </>
      )}
    </div>
  );
}
