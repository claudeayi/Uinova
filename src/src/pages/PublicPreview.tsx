import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Copy,
  Wifi,
  WifiOff,
  RefreshCw,
  Monitor,
  Tablet,
  Smartphone,
} from "lucide-react";

interface PublicProject {
  id: string;
  name: string;
  pages: { id: string; name: string; content: string }[];
  owner: { email: string };
  updatedAt: string;
}

export default function PublicPreview() {
  const { shareId } = useParams<{ shareId: string }>();
  const [project, setProject] = useState<PublicProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageIndex, setPageIndex] = useState(0);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");

  async function fetchPublicProject() {
    try {
      setLoading(true);
      const res = await axios.get(`/api/preview/${shareId}`);
      setProject(res.data);
      setPageIndex(0);
    } catch (err) {
      console.error("❌ Erreur preview public:", err);
      toast.error("Lien invalide ou projet non accessible.");
    } finally {
      setLoading(false);
    }
  }

  /* === Effets === */
  useEffect(() => {
    if (shareId) fetchPublicProject();
  }, [shareId]);

  useEffect(() => {
    const setOnline = () => setIsOnline(true);
    const setOffline = () => setIsOnline(false);
    window.addEventListener("online", setOnline);
    window.addEventListener("offline", setOffline);
    return () => {
      window.removeEventListener("online", setOnline);
      window.removeEventListener("offline", setOffline);
    };
  }, []);

  /* === Handlers === */
  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href);
    toast.success("🔗 Lien copié !");
  }

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-20 text-indigo-500 gap-3">
        <Loader2 className="animate-spin w-6 h-6" />
        <span>Chargement de l’aperçu public...</span>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 text-center text-red-500">
        ❌ Ce lien de preview n’est plus valide.
      </div>
    );
  }

  const currentPage = project.pages[pageIndex];

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <header className="space-y-2 text-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          👁️ Aperçu public : {project.name}
        </h1>
        <p className="text-sm text-gray-500">
          Partagé par {project.owner?.email || "un utilisateur"} • Dernière mise à
          jour {new Date(project.updatedAt).toLocaleString("fr-FR")}
        </p>

        {/* Actions */}
        <div className="flex justify-center gap-3 flex-wrap mt-3">
          <Button size="sm" variant="secondary" onClick={handleCopyLink}>
            <Copy className="w-4 h-4 mr-1" /> Copier lien
          </Button>
          <Button size="sm" onClick={fetchPublicProject}>
            <RefreshCw className="w-4 h-4 mr-1" /> Rafraîchir
          </Button>
          <span
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
              isOnline ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            }`}
          >
            {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            {isOnline ? "En ligne" : "Hors ligne"}
          </span>

          {/* Device switcher */}
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={device === "desktop" ? "default" : "outline"}
              onClick={() => setDevice("desktop")}
            >
              <Monitor className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={device === "tablet" ? "default" : "outline"}
              onClick={() => setDevice("tablet")}
            >
              <Tablet className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={device === "mobile" ? "default" : "outline"}
              onClick={() => setDevice("mobile")}
            >
              <Smartphone className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation pages */}
      {project.pages.length > 1 && (
        <nav className="flex gap-2 justify-center flex-wrap border-b pb-2">
          {project.pages.map((p, idx) => (
            <Button
              key={p.id}
              size="sm"
              variant={idx === pageIndex ? "default" : "outline"}
              onClick={() => setPageIndex(idx)}
            >
              {p.name || `Page ${idx + 1}`}
            </Button>
          ))}
        </nav>
      )}

      {/* Preview */}
      {currentPage ? (
        <div className="flex justify-center">
          <div
            className={`bg-white dark:bg-slate-800 border rounded-lg shadow relative transition-all ${
              device === "desktop"
                ? "w-[1024px] min-h-[600px]"
                : device === "tablet"
                ? "w-[768px] min-h-[500px]"
                : "w-[375px] min-h-[500px]"
            }`}
          >
            <Card className="shadow-none border-0">
              <CardContent className="p-4 space-y-3">
                <h2 className="font-semibold">{currentPage.name}</h2>
                <iframe
                  srcDoc={currentPage.content}
                  title={currentPage.name}
                  className="w-full h-[600px] rounded border dark:border-slate-700 bg-white"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <p className="text-gray-400 text-center">
          Ce projet ne contient aucune page.
        </p>
      )}

      {/* Footer */}
      <footer className="text-center text-xs text-gray-400 pt-6">
        ⚡ Propulsé par <span className="font-semibold text-indigo-600">UInova</span>
      </footer>
    </div>
  );
}
