import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";
import LiveEditor from "@/components/Editor/LiveEditor";
import { DroppedComponent } from "@/components/Editor/LiveEditor";
import { Button } from "@/components/ui/button";

export default function PreviewPage() {
  const { shareId } = useParams<{ shareId: string }>();
  const [project, setProject] = useState<{ id: string; name: string } | null>(
    null
  );
  const [elements, setElements] = useState<DroppedComponent[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchPreview() {
    if (!shareId) return;
    setLoading(true);
    try {
      const res = await axios.get(`/api/share/${shareId}`);
      setProject(res.data.project);
      setElements(res.data.elements || []);
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

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href);
    toast.success("🔗 Lien copié dans le presse-papier !");
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-indigo-500">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
        <span className="ml-3">Chargement de l’aperçu...</span>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex justify-center items-center h-screen text-red-500">
        ❌ Projet introuvable ou lien invalide
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* HEADER PREVIEW */}
      <header className="p-4 bg-indigo-600 text-white flex justify-between items-center">
        <h1 className="font-bold">{project.name} — Aperçu public</h1>
        <Button variant="secondary" size="sm" onClick={handleCopyLink}>
          📋 Copier le lien
        </Button>
      </header>

      {/* LIVE PREVIEW (readonly) */}
      <main className="flex-1 bg-gray-50 dark:bg-slate-900 overflow-auto">
        <div className="max-w-5xl mx-auto p-6">
          <div className="border rounded-lg shadow bg-white dark:bg-slate-800">
            <LiveEditor
              previewOverride={null}
              onSelect={() => {}}
              ref={null}
            />
            {/* ⚠️ On force le rendu en lecture seule */}
            <div className="p-6">
              {elements.length === 0 ? (
                <p className="text-gray-400 text-center">
                  Aucun contenu disponible pour ce projet.
                </p>
              ) : (
                <div className="relative">
                  {elements.map((c) => {
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
                          <button className="w-full h-full bg-indigo-600 text-white rounded">
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
        </div>
      </main>
    </div>
  );
}
