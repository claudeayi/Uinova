import { useState } from "react";
import { Loader2, CheckCircle2, XCircle, Globe } from "lucide-react";
import { deployProject } from "@/services/infra";

export default function DeployWizard({ projectId }: { projectId: string }) {
  const [status, setStatus] = useState<"idle" | "deploying" | "success" | "error">("idle");
  const [logs, setLogs] = useState<string[]>([]);
  const [url, setUrl] = useState<string>("");

  async function handleDeploy() {
    setStatus("deploying");
    setLogs(["⏳ Initialisation du déploiement..."]);
    setUrl("");

    try {
      const res = await deployProject(projectId);

      setLogs((prev) => [...prev, "📦 Build terminé", "🚀 Upload des fichiers", "✅ Déploiement terminé"]);
      setStatus("success");
      setUrl(res.url);
    } catch (err) {
      console.error("❌ Erreur déploiement:", err);
      setLogs((prev) => [...prev, "❌ Une erreur est survenue pendant le déploiement"]);
      setStatus("error");
    }
  }

  return (
    <div className="p-6 bg-gray-900 text-white rounded-lg shadow space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2">
        🚀 Déployer mon projet
      </h2>

      {/* Bouton principal */}
      <button
        onClick={handleDeploy}
        disabled={status === "deploying"}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === "deploying" ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Déploiement en cours...
          </>
        ) : (
          "Déployer"
        )}
      </button>

      {/* Statut */}
      <div className="flex items-center gap-2" aria-live="polite">
        {status === "success" && (
          <>
            <CheckCircle2 className="text-green-400" />
            <span className="text-green-400">Déploiement réussi</span>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="text-red-400" />
            <span className="text-red-400">Erreur de déploiement</span>
          </>
        )}
        {status === "deploying" && (
          <span className="text-yellow-400">Déploiement en cours...</span>
        )}
      </div>

      {/* Logs */}
      {logs.length > 0 && (
        <div className="bg-gray-800 rounded p-3 text-sm font-mono max-h-40 overflow-y-auto border border-gray-700">
          {logs.map((log, i) => (
            <div key={i}>{log}</div>
          ))}
        </div>
      )}

      {/* URL déployée */}
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
        >
          <Globe className="w-4 h-4" />
          Ouvrir le site déployé
        </a>
      )}

      {/* Réessayer en cas d’erreur */}
      {status === "error" && (
        <button
          onClick={handleDeploy}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
        >
          Réessayer
        </button>
      )}
    </div>
  );
}
