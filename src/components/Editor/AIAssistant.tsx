// src/components/ai/AIAssistant.tsx
import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Loader2, Sparkles, Trash2, Download, RefreshCcw } from "lucide-react";
import { cn } from "@/utils/cn";

interface AIAssistantProps {
  onGenerate: (json: any) => void;
  endpoint?: string;
  placeholder?: string;
  defaultPrompt?: string;
  className?: string;
}

type HistoryItem = {
  prompt: string;
  result: any;
  timestamp: number;
};

export default function AIAssistant({
  onGenerate,
  endpoint = "http://localhost:5000/api/ai/generate",
  placeholder = "Décris l'interface que tu veux créer...",
  defaultPrompt = "",
  className,
}: AIAssistantProps) {
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const handleGenerate = async (reusePrompt?: string) => {
    const effectivePrompt = reusePrompt ?? prompt;

    if (!effectivePrompt.trim()) {
      setError("Veuillez entrer une description avant de générer.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const response = await axios.post(endpoint, { prompt: effectivePrompt });
      onGenerate(response.data);

      const item: HistoryItem = {
        prompt: effectivePrompt,
        result: response.data,
        timestamp: Date.now(),
      };
      setHistory((prev) => [item, ...prev]);

      toast.success("Interface générée ✅");
    } catch (err: any) {
      console.error("❌ Erreur génération:", err.response?.data || err.message);
      const message =
        err.response?.data?.message ||
        "Erreur lors de la génération de l’interface.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (data: any) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `uinova-ai-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={cn(
        "p-4 border-b bg-white dark:bg-slate-800 rounded-md shadow-sm",
        className
      )}
    >
      <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-blue-500" />
        Assistant IA
      </h2>

      {/* Zone de saisie */}
      <textarea
        className="w-full border rounded px-3 py-2 mb-2 resize-y min-h-[80px] dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-blue-500"
        placeholder={placeholder}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        disabled={loading}
      />

      {error && (
        <div
          className="text-red-500 text-sm bg-red-50 dark:bg-red-900/30 p-2 rounded mb-2"
          role="alert"
          aria-live="polite"
        >
          {error}
        </div>
      )}

      {/* Bouton principal */}
      <button
        onClick={() => handleGenerate()}
        disabled={loading || !prompt.trim()}
        className="btn w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Génération en cours...
          </span>
        ) : (
          "✨ Générer Interface"
        )}
      </button>

      {/* Historique */}
      {history.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-gray-700 dark:text-gray-300 text-sm">
              Historique des générations
            </span>
            <button
              onClick={() => setHistory([])}
              className="text-xs flex items-center gap-1 text-red-600 hover:underline"
            >
              <Trash2 className="w-3 h-3" />
              Vider
            </button>
          </div>

          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {history.map((h, i) => (
              <li
                key={i}
                className="p-2 border rounded text-sm dark:border-slate-700 bg-gray-50 dark:bg-slate-900"
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="flex-1 text-gray-800 dark:text-gray-200 line-clamp-2">
                    {h.prompt}
                  </span>
                  <div className="flex gap-2">
                    <button
                      title="Régénérer"
                      onClick={() => handleGenerate(h.prompt)}
                      className="text-blue-600 hover:underline flex items-center gap-1 text-xs"
                    >
                      <RefreshCcw className="w-3 h-3" />
                      Relancer
                    </button>
                    <button
                      title="Exporter JSON"
                      onClick={() => handleDownload(h.result)}
                      className="text-green-600 hover:underline flex items-center gap-1 text-xs"
                    >
                      <Download className="w-3 h-3" />
                      Export
                    </button>
                  </div>
                </div>
                <span className="block text-xs text-gray-400">
                  {new Date(h.timestamp).toLocaleTimeString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
