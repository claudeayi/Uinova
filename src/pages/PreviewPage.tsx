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
  Download,
  Sun,
  Moon,
  Camera,
  Share2,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { duplicateProject } from "@/services/projects";

/* ============================================================================
 *  PreviewPage – UInova v8 Ultra-Pro
 * ========================================================================== */
export default function PreviewPage() {
  const { shareId } = useParams<{ shareId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

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
  const [duplicating, setDuplicating] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem("preview-theme") === "dark");
  const [watermark, setWatermark] = useState(true);

  /* === Charger projet === */
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

  async function handleDuplicate() {
    if (!project) return;
    try {
      setDuplicating(true);
      const copy = await duplicateProject(project.id);
      if (copy) {
        toast.success("📂 Projet dupliqué dans votre compte !");
        navigate(`/editor/${copy.id}`);
      }
    } catch (err) {
      console.error("❌ duplicateProject error:", err);
      toast.error("Erreur lors de la duplication.");
    } finally {
      setDuplicating(false);
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

  /* === Capture d’écran === */
  async function handleScreenshot() {
    try {
      const node = document.querySelector("#preview-canvas") as HTMLElement;
      if (!node) return;
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(node);
      const link = document.createElement("a");
      link.download = `${project?.name || "preview"}.png`;
      link.href = canvas.toDataURL();
      link.click();
      toast.success("📸 Capture exportée !");
    } catch {
      toast.error("Impossible de capturer l’écran.");
    }
  }

  /* === Partage social === */
  function handleSocialShare(platform: "twitter" | "linkedin" | "whatsapp") {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`Découvrez mon projet sur UInova : ${project?.name}`);
    let shareUrl = "";
    if (platform === "twitter") shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${text}`;
    if (platform === "linkedin") shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
    if (platform === "whatsapp") shareUrl = `https://api.whatsapp.com/send?text=${text} ${url}`;
    window.open(shareUrl, "_blank");
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
      if (e.ctrlKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        handleScreenshot();
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

  /* === Thème === */
  useEffect(() => {
    document.body.className = dark ? "dark" : "";
    localStorage.setItem("preview-theme", dark ? "dark" : "light");
  }, [dark]);

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
      {/* HEADER */}
      <header className="sticky top-0 z-10 p-4 bg-indigo-600 text-white flex justify-between items-center shadow">
        <div className="flex items-center gap-3">
          <h1 className="font-bold">{project.name} — Aperçu public</h1>
          {project.status && (
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              project.status === "published" ? "bg-green-500/20 text-green-100"
              : project.status === "draft" ? "bg-yellow-500/20 text-yellow-100"
              : "bg-gray-500/20 text-gray-100"
            }`}>
              {project.status}
            </span>
          )}
          {project.updatedAt && (
            <span className="text-xs opacity-75">
              Dernière maj : {new Date(project.updatedAt).toLocaleDateString("fr-FR")}
            </span>
          )}
        </div>

        <div className="flex gap-2 items-center">
          {/* Online status */}
          <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
            isOnline ? "bg-green-500/20" : "bg-red-500/20"
          }`}>
            {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            {isOnline ? "En ligne" : "Hors ligne"}
          </span>

          {/* Device switcher */}
          <Button size="sm" variant={device === "desktop" ? "default" : "secondary"} onClick={() => setDevice("desktop")}><Monitor className="w-4 h-4" /></Button>
          <Button size="sm" variant={device === "tablet" ? "default" : "secondary"} onClick={() => setDevice("tablet")}><Tablet className="w-4 h-4" /></Button>
          <Button size="sm" variant={device === "mobile" ? "default" : "secondary"} onClick={() => setDevice("mobile")}><Smartphone className="w-4 h-4" /></Button>

          {/* Actions */}
          <Button size="sm" variant="secondary" onClick={handleCopyLink}><Copy className="w-4 h-4 mr-1" /> Copier</Button>
          <Button size="sm" onClick={fetchPreview} className="bg-white text-indigo-600 hover:bg-gray-100"><RefreshCw className="w-4 h-4 mr-1" /> Rafraîchir</Button>
          <Button size="sm" onClick={handleScreenshot} className="bg-pink-600 text-white"><Camera className="w-4 h-4 mr-1" /> Capture</Button>
          <Button size="sm" onClick={() => setDark(!dark)}>{dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}</Button>

          {/* Duplication */}
          {user && (
            <Button size="sm" onClick={handleDuplicate} disabled={duplicating} className="bg-pink-600 text-white hover:bg-pink-700">
              {duplicating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Download className="w-4 h-4 mr-1" />}
              Dupliquer
            </Button>
          )}
        </div>
      </header>

      {/* Navigation multi-pages */}
      {project.pages && project.pages.length > 1 && (
        <nav className="flex gap-2 justify-center border-b bg-slate-100 dark:bg-slate-800 py-2">
          <Button size="sm" variant="outline" onClick={() => setPageIndex((i) => Math.max(0, i - 1))}><ArrowLeft className="w-4 h-4" /></Button>
          {project.pages.map((p, idx) => (
            <Button key={p.id} size="sm" variant={idx === pageIndex ? "default" : "outline"} onClick={() => setPageIndex(idx)}>{p.name || `Page ${idx + 1}`}</Button>
          ))}
          <Button size="sm" variant="outline" onClick={() => setPageIndex((i) => Math.min(project.pages!.length - 1, i + 1))}><ArrowRight className="w-4 h-4" /></Button>
        </nav>
      )}

      {/* LIVE PREVIEW */}
      <main className="flex-1 bg-gray-50 dark:bg-slate-900 overflow-auto flex justify-center items-start py-6">
        <div
          id="preview-canvas"
          className={`bg-white dark:bg-slate-800 border rounded-lg shadow relative transition-all ${
            device === "desktop" ? "w-[1024px] min-h-[600px]"
            : device === "tablet" ? "w-[768px] min-h-[500px]"
            : "w-[375px] min-h-[500px]"
          }`}
        >
          {watermark && (
            <span className="absolute bottom-2 right-2 text-[10px] text-gray-400 opacity-70">UInova Preview</span>
          )}
          <div className="p-6 relative">
            {currentPage.elements.length === 0 ? (
              <p className="text-gray-400 text-center py-20">Aucun contenu disponible pour cette page.</p>
            ) : (
              <div className="relative min-h-[400px]">
                {currentPage.elements.map((c) => {
                  const { x, y, width, height, rotate } = c.props || {};
                  return (
                    <div key={c.id} className="absolute" style={{ left: x, top: y, width, height, transform: `rotate(${rotate || 0}deg)` }}>
                      {c.type === "Bouton" && <button className="w-full h-full bg-indigo-600 text-white rounded shadow">{c.props?.text || "Bouton"}</button>}
                      {c.type === "Texte" && <p className="p-2 text-gray-700 dark:text-gray-200">{c.props?.text || "Texte"}</p>}
                      {c.type === "Image" && (
                        <img src={c.props?.src || "https://via.placeholder.com/150"} alt="Aperçu" className="w-full h-full object-cover rounded"
                          onError={(e) => ((e.target as HTMLImageElement).src = "https://via.placeholder.com/150")} />
                      )}
                      {c.type === "Formulaire" && (
                        <form className="space-y-2 p-2">
                          <input type="text" placeholder="Nom" className="w-full px-3 py-2 border rounded dark:bg-slate-700" />
                          <button className="px-4 py-2 bg-green-600 text-white rounded w-full">{c.props?.buttonText || "Envoyer"}</button>
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

      {/* Partage Social */}
      <footer className="p-4 border-t flex gap-3 justify-center bg-slate-50 dark:bg-slate-800">
        <Button size="sm" variant="outline" onClick={() => handleSocialShare("twitter")}>🐦 Twitter</Button>
        <Button size="sm" variant="outline" onClick={() => handleSocialShare("linkedin")}>💼 LinkedIn</Button>
        <Button size="sm" variant="outline" onClick={() => handleSocialShare("whatsapp")}>📱 WhatsApp</Button>
      </footer>
    </div>
  );
}
