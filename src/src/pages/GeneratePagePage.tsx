import { useState } from "react";
import { generatePage } from "@/services/ai";
import { useProject } from "@/context/ProjectContext";
import toast from "react-hot-toast";

export default function GeneratePagePage() {
  const { projectId } = useProject();
  const [prompt, setPrompt] = useState("");
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return toast.error("⚠️ Fournis une description.");
    if (!projectId) return toast.error("⚠️ Sélectionne d’abord un projet actif.");

    setLoading(true);
    setPage(null);

    try {
      const res = await generatePage(projectId, prompt);
      setPage(res);
      toast.success("✅ Page générée avec succès !");
    } catch (err: any) {
      console.error("❌ generatePage error:", err);
      toast.error(err.message || "Erreur génération page");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">📑 Générateur de page IA</h1>

      <form onSubmit={handleGenerate} className="flex space-x-2 mb-4">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Décris la page (ex: page de connexion avec formulaire)"
          className="flex-1 border rounded px-3 py-2"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "⏳..." : "Générer"}
        </button>
      </form>

      {!projectId && (
        <p className="text-sm text-red-600">⚠️ Aucun projet actif. Choisis-en un avec le sélecteur en haut.</p>
      )}

      {page && (
        <div className="mt-6 border rounded bg-white dark:bg-slate-800 p-4">
          <h2 className="text-lg font-semibold mb-2">📄 Nouvelle page générée</h2>
          <p><strong>ID :</strong> {page.id}</p>
          <p><strong>Nom :</strong> {page.name}</p>

          <div className="mt-4">
            <pre className="bg-slate-100 dark:bg-slate-900 p-3 rounded text-xs overflow-x-auto">
              {JSON.stringify(page.schemaJSON, null, 2)}
            </pre>
          </div>

          <div className="mt-4">
            <button
              className="bg-green-600 text-white px-3 py-1 rounded"
              onClick={() => toast.success("⚡ Page importée dans l’éditeur (TODO)")}
            >
              Importer dans l’éditeur
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
