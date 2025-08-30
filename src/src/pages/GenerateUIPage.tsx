import { useState } from "react";
import { generateUI } from "@/services/ai";
import toast from "react-hot-toast";

export default function GenerateUIPage() {
  const [prompt, setPrompt] = useState("");
  const [framework, setFramework] = useState<"react" | "flutter" | "html">("react");
  const [code, setCode] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return toast.error("⚠️ Fournis une description.");

    setLoading(true);
    setCode("");

    try {
      const res = await generateUI(prompt, framework);
      setCode(res.code);
      toast.success("✅ UI générée !");
    } catch (err: any) {
      toast.error(err.message || "Erreur IA");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">🎨 Générateur d’UI avec IA</h1>
      <form onSubmit={handleGenerate} className="flex space-x-2 mb-4">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Décris ton UI (ex: bouton CTA bleu arrondi)"
          className="flex-1 border rounded px-3 py-2"
        />
        <select
          value={framework}
          onChange={(e) => setFramework(e.target.value as any)}
          className="border rounded px-2 py-2"
        >
          <option value="react">React</option>
          <option value="flutter">Flutter</option>
          <option value="html">HTML</option>
        </select>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "⏳..." : "Générer"}
        </button>
      </form>

      {code && (
        <div className="grid grid-cols-2 gap-4">
          {/* Code brut */}
          <div>
            <h2 className="text-lg font-semibold mb-2">📄 Code généré</h2>
            <pre className="bg-slate-900 text-green-400 p-3 rounded overflow-x-auto text-sm max-h-96">
              {code}
            </pre>
          </div>

          {/* Preview (React/HTML seulement) */}
          {framework !== "flutter" ? (
            <div>
              <h2 className="text-lg font-semibold mb-2">👀 Preview</h2>
              <iframe
                title="preview"
                sandbox="allow-scripts allow-same-origin"
                className="w-full h-96 border rounded"
                srcDoc={`<html><head><style>body{font-family:sans-serif;padding:20px;}</style></head><body>${code}</body></html>`}
              />
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              ⚠️ Preview non disponible pour Flutter (affiche uniquement le code).
            </div>
          )}
        </div>
      )}
    </div>
  );
}
