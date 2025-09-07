// src/components/editor/ImportExportModal.tsx
import { useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  generateHTML,
  generateFlutter,
  generateReact,
  generateVue,
  generateJSON,
  importJSON,
  generateZip,
  download,
} from "../../utils/exporters";
import { useAppStore } from "../../store/useAppStore";
import {
  Copy,
  Download as DownloadIcon,
  FileJson,
  X,
  Upload,
  FileArchive,
} from "lucide-react";

export default function ImportExportModal({ onClose }: { onClose: () => void }) {
  const { currentProjectId, currentPageId, projects, emitElements } =
    useAppStore();
  const project = projects.find((p) => p.id === currentProjectId);
  const page = project?.pages.find((p) => p.id === currentPageId);

  const [tab, setTab] = useState<"html" | "flutter" | "react" | "vue" | "json">(
    "html"
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (!page) return null;

  const elements = page.elements;

  const exports = {
    html: generateHTML(elements),
    flutter: generateFlutter(elements),
    react: generateReact(elements),
    vue: generateVue(elements),
    json: generateJSON(elements),
  };

  async function copyToClipboard() {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(exports[tab]);
      } else if (textareaRef.current) {
        textareaRef.current.select();
        document.execCommand("copy");
      }
      toast.success("📋 Copié dans le presse-papier !");
    } catch {
      toast.error("❌ Impossible de copier.");
    }
  }

  async function handleDownloadZip() {
    try {
      const blob = await generateZip(elements);
      download("uinova-export.zip", blob, "application/zip");
      toast.success("📦 ZIP téléchargé !");
    } catch {
      toast.error("❌ Erreur lors de l’export ZIP.");
    }
  }

  function handleImportJSON(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const newElements = importJSON(evt.target?.result as string);
        emitElements(newElements);
        toast.success("✅ Import JSON réussi !");
        onClose();
      } catch {
        toast.error("❌ Import échoué. Vérifiez votre fichier.");
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/70 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 w-[640px] max-w-full rounded-lg shadow-xl p-6 relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-xl text-gray-800 dark:text-gray-100">
            Import / Export
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-700"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex mb-4 space-x-2">
          {["html", "flutter", "react", "vue", "json"].map((f) => (
            <button
              key={f}
              onClick={() => setTab(f as any)}
              className={`px-3 py-1 rounded text-sm font-medium transition ${
                tab === f
                  ? "bg-blue-600 text-white shadow"
                  : "bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-600"
              }`}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Textarea */}
        <textarea
          className="w-full h-44 border rounded mb-3 p-2 font-mono text-xs dark:bg-slate-800 dark:border-slate-700 text-gray-800 dark:text-gray-100"
          value={exports[tab]}
          ref={textareaRef}
          readOnly
        />

        {/* Actions */}
        <div className="flex gap-2 mb-3 flex-wrap">
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
          >
            <Copy className="w-4 h-4" /> Copier
          </button>

          <button
            onClick={() =>
              download(
                `export.${tab === "flutter" ? "dart" : tab}`,
                exports[tab]
              )
            }
            className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded transition"
          >
            <DownloadIcon className="w-4 h-4" /> Télécharger
          </button>

          {tab === "json" && (
            <label className="inline-flex items-center gap-1 px-3 py-1 bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-gray-200 rounded cursor-pointer hover:bg-gray-300 dark:hover:bg-slate-600 transition">
              <Upload className="w-4 h-4" /> Importer JSON
              <input
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleImportJSON}
              />
            </label>
          )}

          <button
            onClick={handleDownloadZip}
            className="flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded ml-auto transition"
          >
            <FileArchive className="w-4 h-4" /> Export ZIP
          </button>
        </div>

        {/* Footer */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1 bg-gray-300 hover:bg-gray-400 dark:bg-slate-700 dark:hover:bg-slate-600 rounded text-gray-800 dark:text-gray-200 transition"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
