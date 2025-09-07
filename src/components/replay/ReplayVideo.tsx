import { useState } from "react";
import { Loader2, Download, RefreshCw } from "lucide-react";

export default function ReplayVideo({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const videoUrl = `/api/replay/${projectId}/video`;

  const handleReload = () => {
    setLoading(true);
    setError("");
    const video = document.getElementById("replay-video") as HTMLVideoElement;
    if (video) {
      video.load();
      video.play().catch(() => setError("Impossible de relire la vidéo."));
    }
  };

  return (
    <div className="p-4 bg-black rounded-lg relative shadow-lg">
      {/* Toolbar */}
      <div className="absolute top-2 right-2 flex gap-2 z-10">
        <a
          href={videoUrl}
          download={`uinova-replay-${projectId}.mp4`}
          className="p-2 bg-white/80 dark:bg-gray-800/80 rounded hover:bg-white dark:hover:bg-gray-700 transition"
          title="Télécharger"
        >
          <Download className="w-4 h-4 text-blue-600" />
        </a>
        <button
          onClick={handleReload}
          className="p-2 bg-white/80 dark:bg-gray-800/80 rounded hover:bg-white dark:hover:bg-gray-700 transition"
          title="Recharger"
        >
          <RefreshCw className="w-4 h-4 text-blue-600" />
        </button>
      </div>

      {/* Loader */}
      {loading && !error && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/70"
          aria-live="polite"
        >
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-200">Chargement...</span>
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div className="flex flex-col items-center justify-center h-64 text-red-500 gap-2">
          <p>{error}</p>
          <button
            onClick={handleReload}
            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Vidéo */}
      <video
        id="replay-video"
        className="w-full rounded"
        controls
        onLoadedData={() => setLoading(false)}
        onError={() => {
          setError("❌ Erreur lors du chargement de la vidéo.");
          setLoading(false);
        }}
      >
        <source src={videoUrl} type="video/mp4" />
        Votre navigateur ne supporte pas la lecture vidéo.
      </video>
    </div>
  );
}
