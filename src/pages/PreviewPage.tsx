// src/pages/PreviewPage.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";
import { DroppedComponent } from "@/components/Editor/LiveEditor";
import { Button } from "@/components/ui/button";
import {
  Copy,
  RefreshCw,
  Monitor,
  Tablet,
  Smartphone,
  Wifi,
  WifiOff,
  Store,
  Loader2,
} from "lucide-react";

/* ============================================================================
 *  PreviewPage – Aperçu public UInova v6
 *  ✅ Lecture seule avec rendu components
 *  ✅ Copier lien, rafraîchir, responsive devices
 *  ✅ Support multi-pages
 *  ✅ Indicateur online/offline + hotkeys
 * ========================================================================== */
export default function PreviewPage() {
  const { shareId } = useParams<{ shareId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<{
    id: string;
    name: string;
    status?: string;
    updatedAt?: string;
    pages?: { id: string; name: string; elements: DroppedComponent[] }[];
  } | null>(null);

  const [pageIndex, setPageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  async function fetchPreview() {
    if (!shareId) return;
    setLoading(true);
    try {
      const res = await axios.get(`/api/share/${shareId}`);
      setProject(res.data.project || null);
      setPageIndex(0);
    } catch (err: any) {
      console.error("❌ fetchPreview error:", err);
      toast.error("Impossible de charger l’aperçu.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPreview();
  }, [shareId]);

  /* === Copier lien === */
  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href);
    toast.success("🔗 Lien copié !");
  }

  /* === Hotkeys === */
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.ctrlKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        handleCopyLink();
      }
      if (e.ctrlKey && e.key.toLowerCase() === "r") {
        e.preventDefault();
        fetchPreview();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  /* === Online/Offline === */
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-indigo-500">
        <Loader2 className="animate-spin w-6 h-6 mr-2" />
        Chargement de l’aperçu...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-red-500 gap-4">
        ❌ Projet introuvable ou lien invalide
        <Button onClick={() => navigate("/marketplace")} className="bg-indigo-600 text-white">
          <Store className="w-4 h-4 mr-2" /> Découvrir la Marketplace
        </Button>
      </div>
    );
  }

  const currentPage = project.pages?.[pageIndex] || { elements: [] };

  return (
    <div className="h-screen flex flex-col">
      {/* HEADER PREVIEW */}
      <header className="sticky top-0 z-10 p-4 bg-indigo-600 text-white flex justify-between items-center shadow">
        <div className="flex items-center gap-3">
          <h1 className="font-bold">{project.name} — Aperçu public</h1>
          {project.status && (
            <span
              className={`px-2 py-0.5 rounded-full text-xs ${
                project.status === "published"
                  ? "bg-green-500/20 text-green-100"
                  : project.status === "draft"
                  ? "bg-yellow-500/20 text-yellow-100"
                  : "bg-gray-500/20 text-gray-100"
              }`}
            >
              {project.status}
            </span>
          )}
          {project.updatedAt && (
            <span className="text-xs opacity-75">
              Dernière mise à jour :{" "}
              {new Date(project.updatedAt).toLocaleDateString("fr-FR")}
            </span>
          )}
        </div>

        <div className="flex gap-2 items-center">
          {/* Online status */}
          <span
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
              isOnline ? "bg-green-500/20" : "bg-red-500/20"
            }`}
          >
            {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            {isOnline ? "En ligne" : "Hors ligne"}
          </span>

          {/* Device switcher */}
          <Button
            size="sm"
            variant={device === "desktop" ? "default" : "secondary"}
            onClick={() => setDevice("desktop")}
          >
            <Monitor className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant={device === "tablet" ? "default" : "secondary"}
            onClick={() => setDevice("tablet")}
          >
            <Tablet className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant={device === "mobile" ? "default" : "secondary"}
            onClick={() => setDevice("mobile")}
          >
            <Smartphone className="w-4 h-4" />
          </Button>

          {/* Actions */}
          <Button variant="secondary" size="sm" onClick={handleCopyLink}>
            <Copy className="w-4 h-4 mr-1" /> Copier
          </Button>
          <Button
            size="sm"
            onClick={fetchPreview}
            className="bg-white text-indigo-600 hover:bg-gray-100"
          >
            <RefreshCw className="w-4 h-4 mr-1" /> Rafraîchir
          </Button>
        </div>
      </header>

      {/* Navigation entre pages */}
      {project.pages && project.pages.length > 1 && (
        <nav className="flex gap-2 justify-center border-b bg-slate-100 dark:bg-slate-800 py-2">
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

      {/* LIVE PREVIEW (readonly) */}
      <main className="flex-1 bg-gray-50 dark:bg-slate-900 overflow-auto flex justify-center items-start py-6">
        <div
          className={`bg-white dark:bg-slate-800 border rounded-lg shadow relative transition-all ${
            device === "desktop"
              ? "w-[1024px] min-h-[600px]"
              : device === "tablet"
              ? "w-[768px] min-h-[500px]"
              : "w-[375px] min-h-[500px]"
          }`}
        >
          <div className="p-6 relative">
            {currentPage.elements.length === 0 ? (
              <p className="text-gray-400 text-center py-20">
                Aucun contenu disponible pour cette page.
              </p>
            ) : (
              <div className="relative min-h-[400px]">
                {currentPage.elements.map((c) => {
                  const { x, y, width, height, rotate } = c.props || {};
                  return (
                    <div
                      key={c.id}
                      className="absolute"
                      style={{
                        left: x,
                        top: y,
                        width,
                        height,
                        transform: `rotate(${rotate || 0}deg)`,
                      }}
                    >
                      {c.type === "Bouton" && (
                        <button className="w-full h-full bg-indigo-600 text-white rounded shadow">
                          {c.props?.text || "Bouton"}
                        </button>
                      )}
                      {c.type === "Texte" && (
                        <p className="p-2 text-gray-700 dark:text-gray-200">
                          {c.props?.text || "Texte"}
                        </p>
                      )}
                      {c.type === "Image" && (
                        <img
                          src={c.props?.src || "https://via.placeholder.com/150"}
                          alt="Aperçu"
                          className="w-full h-full object-cover rounded"
                          onError={(e) =>
                            ((e.target as HTMLImageElement).src =
                              "https://via.placeholder.com/150")
                          }
                        />
                      )}
                      {c.type === "Formulaire" && (
                        <form className="space-y-2 p-2">
                          <input
                            type="text"
                            placeholder="Nom"
                            className="w-full px-3 py-2 border rounded dark:bg-slate-700"
                          />
                          <button className="px-4 py-2 bg-green-600 text-white rounded w-full">
                            {c.props?.buttonText || "Envoyer"}
                          </button>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
