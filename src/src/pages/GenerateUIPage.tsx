// src/pages/GenerateUIPage.tsx
import { useState } from "react";
import { generateUI } from "@/services/ai";
import toast from "react-hot-toast";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, Download } from "lucide-react";

export default function GenerateUIPage() {
  const [prompt, setPrompt] = useState("");
  const [framework, setFramework] = useState<"react" | "flutter" | "html">("react");
  const [code, setCode] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<{ prompt: string; framework: string }[]>([]);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return toast.error("⚠️ Fournis une description.");

    setLoading(true);
    setCode("");

    try {
      const res = await generateUI(prompt, framework);
      setCode(res.code);
      setHistory((prev) => [{ prompt, framework }, ...prev.slice(0, 4)]);
      toast.success("✅ UI générée !");
    } catch (err: any) {
      console.error("❌ Erreur IA:", err);
      toast.error(err.message || "Erreur IA");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!code) return;
    navigator.clipboard.writeText(code);
    toast.success("📋 Code copié !");
  }

  function handleDownload() {
    if (!code) return;
    const ext = framework === "react" ? "jsx" : framework === "flutter" ? "dart" : "html";
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `uinova-ui.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("💾 Code téléchargé");
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <h1 className="text-2xl font-bold">🎨 Générateur d’UI avec IA</h1>
        <p className="text-gray-500">
          Décris ton interface et choisis le framework cible. UInova génère le code
          prêt à l’emploi et te propose une prévisualisation en direct.
        </p>

        {/* Formulaire */}
        <form
          onSubmit={handleGenerate}
          className="flex flex-col md:flex-row gap-3 items-start"
        >
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ex: bouton CTA bleu arrondi avec icône"
            className="flex-1 border rounded px-3 py-2 dark:bg-slate-900 dark:border-slate-700 w-full"
          />
          <select
            value={framework}
            onChange={(e) => setFramework(e.target.value as any)}
            className="border rounded px-2 py-2 dark:bg-slate-900 dark:border-slate-700"
          >
            <option value="react">⚛️ React</option>
            <option value="flutter">📱 Flutter</option>
            <option value="html">🌐 HTML</option>
          </select>
          <Button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Génération..." : "Générer"}
          </Button>
        </form>

        {/* Historique */}
        {history.length > 0 && (
          <div className="space-y-2">
            <h2 className="font-semibold text-sm text-gray-600">⏳ Historique</h2>
            <ul className="text-xs text-gray-500 space-y-1">
              {history.map((h, i) => (
                <li key={i}>
                  {h.prompt} <span className="italic">({h.framework})</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Résultats */}
        {code && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Code brut */}
            <CardBlock title="📄 Code généré">
              <pre className="bg-slate-900 text-green-400 p-3 rounded overflow-x-auto text-sm max-h-[500px] whitespace-pre-wrap">
                {code}
              </pre>
              <div className="flex gap-2 mt-3">
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  <Copy className="w-4 h-4 mr-1" /> Copier
                </Button>
                <Button size="sm" onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-1" /> Télécharger
                </Button>
              </div>
            </CardBlock>

            {/* Preview */}
            <CardBlock title="👀 Preview">
              {framework !== "flutter" ? (
                <iframe
                  title="preview"
                  sandbox="allow-scripts allow-same-origin"
                  className="w-full h-[500px] border rounded"
                  srcDoc={`<html><head><style>body{font-family:sans-serif;padding:20px;}</style></head><body>${code}</body></html>`}
                />
              ) : (
                <p className="text-sm text-gray-500">
                  ⚠️ Preview non disponible pour Flutter. Télécharge le code et lance-le
                  dans ton IDE Flutter.
                </p>
              )}
            </CardBlock>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

/* ============================================================================
 *  Bloc réutilisable
 * ========================================================================== */
function CardBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-800 p-4 rounded shadow">
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      {children}
    </div>
  );
}
