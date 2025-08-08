import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { generateHTML, generateFlutter, generateReact, generateVue, generateJSON, importJSON, generateZip, download } from "../../utils/exporters";
import { useAppStore } from "../../store/useAppStore";

export default function ImportExportModal({ onClose }: { onClose: () => void }) {
  const { currentProjectId, currentPageId, projects, emitElements } = useAppStore();
  const project = projects.find(p => p.id === currentProjectId);
  const page = project?.pages.find(p => p.id === currentPageId);

  const [tab, setTab] = useState<"html"|"flutter"|"react"|"vue"|"json">("html");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (!page) return null;

  const elements = page.elements;

  const exports = {
    html: generateHTML(elements),
    flutter: generateFlutter(elements),
    react: generateReact(elements),
    vue: generateVue(elements),
    json: generateJSON(elements)
  };

  function copyToClipboard() {
    if (!textareaRef.current) return;
    textareaRef.current.select();
    document.execCommand("copy");
    toast.success("Copié !");
  }

  async function handleDownloadZip() {
    const blob = await generateZip(elements);
    download("uinova-export.zip", blob, "application/zip");
    toast.success("ZIP téléchargé !");
  }

  function handleImportJSON(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const newElements = importJSON(evt.target?.result as string);
        emitElements(newElements);
        toast.success("Import réussi !");
        onClose();
      } catch {
        toast.error("Import échoué !");
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white w-[600px] max-w-full rounded shadow-lg p-6">
        <h2 className="font-semibold mb-4 text-xl">Import / Export</h2>
        <div className="flex mb-4 space-x-2">
          {["html", "flutter", "react", "vue", "json"].map(f =>
            <button
              key={f}
              onClick={() => setTab(f as any)}
              className={`px-3 py-1 rounded ${tab === f ? "bg-blue-600 text-white" : "bg-gray-200"}`}
            >{f.toUpperCase()}</button>
          )}
        </div>

        <textarea
          className="w-full h-40 border rounded mb-3 p-2 font-mono text-xs"
          value={exports[tab]}
          ref={textareaRef}
          readOnly
        />
        <div className="flex gap-2 mb-3">
          <button onClick={copyToClipboard} className="px-3 py-1 bg-blue-600 text-white rounded">Copier</button>
          <button onClick={() => download(`export.${tab === "flutter" ? "dart" : tab}`, exports[tab])} className="px-3 py-1 bg-green-600 text-white rounded">Télécharger</button>
          {tab === "json" && (
            <>
              <label className="inline-block bg-gray-200 px-3 py-1 rounded cursor-pointer hover:bg-gray-300">
                Importer JSON
                <input
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleImportJSON}
                />
              </label>
            </>
          )}
          <button onClick={handleDownloadZip} className="px-3 py-1 bg-purple-600 text-white rounded ml-auto">Export ZIP</button>
        </div>
        <div className="flex justify-end">
          <button onClick={onClose} className="px-3 py-1 bg-gray-300 rounded">Fermer</button>
        </div>
      </div>
    </div>
  );
}
