import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Maximize2, AlertTriangle } from "lucide-react";

export default function MonitoringDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [src, setSrc] = useState(
    "http://localhost:3000/d/grafana-dashboard/u-inova?refresh=10s"
  );

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500); // ⏳ simulation chargement
    return () => clearTimeout(timer);
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    setSrc(`${src.split("?")[0]}?refresh=${Date.now()}`);
    setTimeout(() => setLoading(false), 1200);
  };

  const handleFullscreen = () => {
    const iframe = document.getElementById("grafana-frame") as HTMLIFrameElement;
    if (iframe?.requestFullscreen) iframe.requestFullscreen();
  };

  return (
    <div className="w-full h-[600px] bg-gray-100 dark:bg-gray-900 rounded-lg shadow relative overflow-hidden">
      {/* Toolbar */}
      <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
        <button
          onClick={handleRefresh}
          className="p-2 bg-white/80 dark:bg-gray-800/80 rounded shadow hover:bg-white dark:hover:bg-gray-700 transition"
          title="Rafraîchir"
        >
          <RefreshCw className="w-4 h-4 text-blue-600" />
        </button>
        <button
          onClick={handleFullscreen}
          className="p-2 bg-white/80 dark:bg-gray-800/80 rounded shadow hover:bg-white dark:hover:bg-gray-700 transition"
          title="Plein écran"
        >
          <Maximize2 className="w-4 h-4 text-blue-600" />
        </button>
      </div>

      {/* Contenu */}
      {loading && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900"
          aria-live="polite"
        >
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600 dark:text-gray-300">
            Chargement du dashboard...
          </span>
        </div>
      )}

      {error ? (
        <div className="flex flex-col items-center justify-center h-full text-red-600 gap-2">
          <AlertTriangle className="w-8 h-8" />
          <p>{error || "Impossible de charger le dashboard Grafana."}</p>
        </div>
      ) : (
        <iframe
          id="grafana-frame"
          src={src}
          width="100%"
          height="100%"
          frameBorder="0"
          title="Monitoring"
          onError={() => setError("Erreur de connexion à Grafana")}
          className="rounded-lg"
        />
      )}
    </div>
  );
}
