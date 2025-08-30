import { useState } from "react";
import { suggestUI } from "@/services/ai";
import { useProject } from "@/context/ProjectContext";
import toast from "react-hot-toast";

export default function SuggestUIPage() {
  const { projectId } = useProject();
  const [pageId, setPageId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function handleSuggest(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId) return toast.error("⚠️ Sélectionne un projet actif.");
    if (!pageId.trim()) return toast.error("⚠️ Fournis l’ID de la page.");
    if (!prompt.trim()) return toast.error("⚠️ Fournis une description de la suggestion.");

    setLoading(true);
    setResult(null);

    try {
      const res = await suggestUI(projectId, pageId, prompt);
      setResult(res);
      toast.success("✅ Suggestion générée avec succès !");
    } catch (err: any) {
      console.error("❌ suggestUI error:", err);
      toast.error(err.message || "Erreur génération suggestion UI");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">🎨 Suggestions UI (IA)</h1>

      <form onSubmit={handleSuggest} className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-1">ID de la page</label>
          <input
            type="text"
            value={pageId}
            onChange={(e) => setPageId(e.target.value)}
            placeholder="Ex: page_123"
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Suggestion IA</label>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ex: Ajoute un bouton call-to-action en bas"
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "⏳..." : "Envoyer"}
        </button>
      </form>

      {result && (
        <div className="border rounded p-4 bg-white dark:bg-slate-800">
          <h2 className="text-lg font-semibold mb-2">Résultat suggestion</h2>

          <div>
            <h3 className="font-medium">⚡ Ops générées :</h3>
            <pre className="bg-slate-100 dark:bg-slate-900 p-3 rounded text-xs overflow-x-auto mb-4">
              {JSON.stringify(result.ops, null, 2)}
            </pre>
          </div>

          <div>
            <h3 className="font-medium">👀 Aperçu proposé :</h3>
            <pre className="bg-slate-100 dark:bg-slate-900 p-3 rounded text-xs overflow-x-auto">
              {JSON.stringify(result.preview, null, 2)}
            </pre>
          </div>

          <button
            className="mt-4 bg-green-600 text-white px-3 py-1 rounded"
            onClick={() => toast.success("⚡ Suggestions appliquées (TODO éditeur)")}
          >
            Appliquer à l’éditeur
          </button>
        </div>
      )}
    </div>
  );
}
