import React from "react";

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

  // Export ZIP (page courante)
  onExportZip?: () => void;
  zipLoading?: boolean;

  // ✅ Nouveau : Export Site (multi-pages)
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
  const wrapStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    padding: 8,
    marginBottom: 16,
    borderRadius: 8,
    border: "1px solid var(--border, #e5e7eb)",
    background: "var(--bg, #f3f4f6)",
  };

  const btnStyle: React.CSSProperties = {
    padding: "6px 10px",
    fontSize: 14,
    borderRadius: 6,
    background: "var(--btn-bg, #fff)",
    color: "var(--btn-fg, #111827)",
    border: "1px solid var(--btn-border, #d1d5db)",
    cursor: "pointer",
  };

  const btnDisabled: React.CSSProperties = {
    opacity: 0.5,
    cursor: "not-allowed",
  };

  const sepStyle: React.CSSProperties = {
    width: 1,
    height: 24,
    background: "var(--sep, #d1d5db)",
    marginInline: 4,
  };

  return (
    <div style={wrapStyle} role="toolbar" aria-label="Barre d'outils UInova">
      {/* Undo / Redo */}
      <button
        style={{ ...btnStyle, ...(canUndo ? {} : btnDisabled) }}
        onClick={onUndo}
        disabled={!canUndo}
        title="Annuler (Ctrl/Cmd + Z)"
        aria-label="Annuler"
      >
        ↩️ Undo
      </button>
      <button
        style={{ ...btnStyle, ...(canRedo ? {} : btnDisabled) }}
        onClick={onRedo}
        disabled={!canRedo}
        title="Rétablir (Ctrl/Cmd + Y / Shift+Z)"
        aria-label="Rétablir"
      >
        ↪️ Redo
      </button>

      <span style={sepStyle} />

      {/* Dupliquer / Supprimer */}
      <button
        style={{ ...btnStyle, ...(hasSelection ? {} : btnDisabled) }}
        onClick={onDuplicate}
        disabled={!hasSelection}
        title="Dupliquer (Ctrl/Cmd + D)"
        aria-label="Dupliquer"
      >
        📄 Dupliquer
      </button>
      <button
        style={{ ...btnStyle, ...(hasSelection ? {} : btnDisabled) }}
        onClick={onDelete}
        disabled={!hasSelection}
        title="Supprimer (Del)"
        aria-label="Supprimer"
      >
        🗑️ Supprimer
      </button>

      <span style={sepStyle} />

      {/* Aperçu / Export HTML */}
      <button
        style={btnStyle}
        onClick={onPreview}
        title="Aperçu live"
        aria-label="Aperçu"
      >
        👁️ Aperçu
      </button>
      <button
        style={btnStyle}
        onClick={onExportHTML}
        title="Exporter en HTML (avec données CMS)"
        aria-label="Exporter HTML"
      >
        ⬇️ Export HTML
      </button>

      {/* Export ZIP (page courante) */}
      {onExportZip && (
        <button
          style={{ ...btnStyle, ...(zipLoading ? btnDisabled : {}) }}
          onClick={onExportZip}
          disabled={zipLoading}
          title="ZIP (HTML + React + Vue + Flutter + JSON)"
          aria-label="Exporter ZIP"
        >
          {zipLoading ? "⏳ ZIP…" : "📦 Export ZIP"}
        </button>
      )}

      {/* ✅ Export Site (multi-pages) */}
      {onExportSite && (
        <button
          style={{ ...btnStyle, ...(siteLoading ? btnDisabled : {}) }}
          onClick={onExportSite}
          disabled={siteLoading}
          title="Exporter le site (toutes les pages)"
          aria-label="Exporter Site"
        >
          {siteLoading ? "⏳ Site…" : "🌐 Export Site"}
        </button>
      )}

      {/* Import/Export JSON (modal) */}
      {onOpenImportExport && (
        <>
          <span style={sepStyle} />
          <button
            style={btnStyle}
            onClick={onOpenImportExport}
            title="Importer / Exporter (JSON, ZIP...)"
            aria-label="Importer / Exporter"
          >
            🔁 Import/Export
          </button>
        </>
      )}

      <div style={{ flex: 1 }} />
    </div>
  );
}
