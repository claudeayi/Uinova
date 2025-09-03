// src/pages/TemplateDetail.tsx
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
  Loader2,
  Eye,
  Download,
  User,
  Calendar,
  ArrowLeft,
  Monitor,
  Tablet,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { duplicateProject } from "@/services/projects";
import DashboardLayout from "@/layouts/DashboardLayout";
import { DroppedComponent } from "@/components/Editor/LiveEditor";

/* ============================================================================
 *  TemplateDetail – Vue détaillée avec mini-preview intégré
 * ========================================================================== */
interface Template {
  id: string;
  shareId: string;
  name: string;
  description?: string;
  status: string;
  updatedAt: string;
  owner?: { id: string; email: string };
  pages?: { id: string; name: string; elements?: DroppedComponent[] }[];
}

export default function TemplateDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [duplicating, setDuplicating] = useState(false);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");

  async function fetchTemplate() {
    if (!id) return;
    setLoading(true);
    try {
      const res = await axios.get(`/api/templates/${id}`);
      setTemplate(res.data);
    } catch (err) {
      console.error("❌ fetchTemplate error:", err);
      toast.error("Impossible de charger le template.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDuplicate() {
    if (!template) return;
    try {
      setDuplicating(true);
      const copy = await duplicateProject(template.id);
      if (copy) {
        toast.success("📂 Template dupliqué dans votre compte !");
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
    fetchTemplate();
  }, [id]);

  return (
    <DashboardLayout>
      <div className="p-6">
        {loading ? (
          <div className="flex justify-center items-center py-20 text-indigo-500">
            <Loader2 className="animate-spin w-6 h-6 mr-2" />
            Chargement du template...
          </div>
        ) : !template ? (
          <div className="text-center py-20 text-gray-500">
            ❌ Template introuvable
            <div className="mt-4">
              <Button onClick={() => navigate("/marketplace")} className="bg-indigo-600 text-white">
                Retour à la Marketplace
              </Button>
            </div>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => navigate(-1)} className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" /> Retour
              </Button>
            </div>

            <Card>
              <CardContent className="p-6">
                <h1 className="text-2xl font-bold text-indigo-600 mb-2">
                  {template.name}
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {template.description || "Aucune description fournie."}
                </p>

                <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400 mb-6">
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" /> {template.owner?.email || "Anonyme"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(template.updatedAt).toLocaleDateString("fr-FR")}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs ${
                      template.status === "published"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {template.status}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3">
                  <Link
                    to={`/preview/${template.shareId}`}
                    target="_blank"
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded text-sm"
                  >
                    <Eye className="w-4 h-4" /> Voir en Preview
                  </Link>
                  {user && (
                    <Button
                      onClick={handleDuplicate}
                      disabled={duplicating}
                      className="bg-pink-600 text-white hover:bg-pink-700"
                    >
                      {duplicating ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      ) : (
                        <Download className="w-4 h-4 mr-1" />
                      )}
                      Dupliquer
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Pages */}
            {template.pages && template.pages.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold mb-4">📑 Pages incluses</h2>
                  <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-300 mb-6">
                    {template.pages.map((p) => (
                      <li key={p.id}>{p.name || `Page ${p.id}`}</li>
                    ))}
                  </ul>

                  {/* Mini Preview intégré */}
                  <div className="mb-4 flex gap-2">
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
                  </div>

                  <div className="flex justify-center">
                    <div
                      className={`bg-white dark:bg-slate-800 border rounded-lg shadow relative ${
                        device === "desktop"
                          ? "w-[1024px] min-h-[600px]"
                          : device === "tablet"
                          ? "w-[768px] min-h-[500px]"
                          : "w-[375px] min-h-[500px]"
                      }`}
                    >
                      <div className="p-6 relative">
                        {template.pages[0]?.elements?.length ? (
                          <div className="relative min-h-[400px]">
                            {template.pages[0].elements.map((c) => {
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
                        ) : (
                          <p className="text-gray-400 text-center py-20">
                            Aucun contenu disponible dans ce template.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
