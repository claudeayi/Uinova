// src/pages/ExportPage.tsx
import { useParams } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";
import { generateHTML, generateFlutter } from "../utils/exporters";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { Download, Copy, FileArchive } from "lucide-react";
import JSZip from "jszip";

/* ============================================================================
 *  ExportPage – UInova v4 ultra-pro avec ZIP multi-formats
 * ========================================================================== */
export default function ExportPage() {
  const { projectId, pageId } = useParams();
  const { projects } = useAppStore();
  const [loading, setLoading] = useState(false);

  const project = projects.find((p) => p.id === projectId);
  const page = project?.pages.find((p) => p.id === pageId);

  if (!project) {
    return <div className="p-8 text-red-600">❌ Projet introuvable</div>;
  }
  if (!page) {
    return <div className="p-8 text-red-600">❌ Page introuvable</div>;
  }

  // Générateurs existants
  const htmlCode = generateHTML(page.elements);
  const flutterCode = generateFlutter(page.elements);

  // Générateurs placeholders (React/Vue) à compléter si besoin
  const reactCode = `import React from "react";

export default function ${page.name.replace(/\s+/g, "")}() {
  return (
    <div>
      {/* Composants exportés depuis UInova */}
    </div>
  );
}`;
  const vueCode = `<template>
  <div>
    <!-- Composants exportés depuis UInova -->
  </div>
</template>

<script setup>
export default {};
</script>`;

  /* ============================================================================
   * Utils
   * ========================================================================== */
  function copyToClipboard(code: string, type: string) {
    navigator.clipboard
      .writeText(code)
      .then(() => toast.success(`✅ ${type} copié dans le presse-papier`))
      .catch(() => toast.error("❌ Impossible de copier"));
  }

  function downloadFile(content: string, filename: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    toast.success(`💾 ${filename} téléchargé`);
  }

  async function downloadZip() {
    try {
      setLoading(true);
      const zip = new JSZip();
      zip.file(`${page.name}.html`, htmlCode);
      zip.file(`${page.name}.dart`, flutterCode);
      zip.file(`${page.name}.tsx`, reactCode);
      zip.file(`${page.name}.vue`, vueCode);

      const blob = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${page.name}-exports.zip`;
      link.click();

      toast.success("📦 ZIP téléchargé avec succès");
    } catch (err) {
      console.error("❌ ZIP export error:", err);
      toast.error("Erreur lors de la génération du ZIP");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
        📤 Exportation multi-formats : {page.name}
      </h2>

      {/* Actions globales */}
      <div className="flex justify-end">
        <button
          onClick={downloadZip}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
        >
          <FileArchive className="w-4 h-4" />
          {loading ? "Création ZIP..." : "Télécharger tout (ZIP)"}
        </button>
      </div>

      {/* HTML Export */}
      <ExportBlock
        title="🔤 HTML"
        code={htmlCode}
        filename={`${page.name}.html`}
        mime="text/html"
        onCopy={() => copyToClipboard(htmlCode, "HTML")}
        onDownload={() => downloadFile(htmlCode, `${page.name}.html`, "text/html")}
      />

      {/* Flutter Export */}
      <ExportBlock
        title="🧠 Flutter"
        code={flutterCode}
        filename={`${page.name}.dart`}
        mime="text/x-dart"
        onCopy={() => copyToClipboard(flutterCode, "Flutter")}
        onDownload={() => downloadFile(flutterCode, `${page.name}.dart`, "text/x-dart")}
      />

      {/* React Export */}
      <ExportBlock
        title="⚛️ React"
        code={reactCode}
        filename={`${page.name}.tsx`}
        mime="text/tsx"
        onCopy={() => copyToClipboard(reactCode, "React")}
        onDownload={() => downloadFile(reactCode, `${page.name}.tsx`, "text/tsx")}
      />

      {/* Vue Export */}
      <ExportBlock
        title="🟢 Vue"
        code={vueCode}
        filename={`${page.name}.vue`}
        mime="text/vue"
        onCopy={() => copyToClipboard(vueCode, "Vue")}
        onDownload={() => downloadFile(vueCode, `${page.name}.vue`, "text/vue")}
      />
    </div>
  );
}

/* ============================================================================
 *  ExportBlock – Bloc réutilisable pour affichage + actions
 * ========================================================================== */
function ExportBlock({
  title,
  code,
  filename,
  mime,
  onCopy,
  onDownload,
}: {
  title: string;
  code: string;
  filename: string;
  mime: string;
  onCopy: () => void;
  onDownload: () => void;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 border rounded-lg shadow p-4 space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-lg">{title}</h3>
        <div className="flex gap-2">
          <button
            onClick={onCopy}
            aria-label={`Copier ${title}`}
            className="flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600"
          >
            <Copy className="w-4 h-4" /> Copier
          </button>
          <button
            onClick={onDownload}
            aria-label={`Télécharger ${filename}`}
            className="flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700"
          >
            <Download className="w-4 h-4" /> Télécharger
          </button>
        </div>
      </div>
      <textarea
        className="w-full border rounded p-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 text-gray-700 dark:text-gray-200"
        rows={12}
        value={code}
        readOnly
      />
    </div>
  );
}
