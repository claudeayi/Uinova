import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Loader2,
  Eye,
  Download,
  User,
  Calendar,
  Info,
  Star,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { duplicateProject } from "@/services/projects";
import DashboardLayout from "@/layouts/DashboardLayout";
import { useFavorites } from "@/context/FavoritesContext";

/* ============================================================================
 *  TemplateExplorer – Marketplace templates publics
 * ========================================================================== */
interface Template {
  id: string;
  shareId: string;
  name: string;
  status: string;
  updatedAt: string;
  owner?: { id: string; email: string };
}

export default function TemplateExplorer() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [duplicating, setDuplicating] = useState<string | null>(null);

  const { user } = useAuth();
  const { toggleFavorite, isFavorite } = useFavorites();
  const navigate = useNavigate();

  /* === Charger templates publics === */
  async function fetchTemplates() {
    setLoading(true);
    try {
      const res = await axios.get("/api/templates");
      setTemplates(res.data || []);
    } catch (err) {
      console.error("❌ fetchTemplates error:", err);
      toast.error("Impossible de charger les templates.");
    } finally {
      setLoading(false);
    }
  }

  /* === Dupliquer un template === */
  async function handleDuplicate(id: string) {
    try {
      setDuplicating(id);
      const copy = await duplicateProject(id);
      if (copy) {
        toast.success("📂 Template dupliqué dans votre compte !");
        navigate(`/editor/${copy.id}`);
      }
    } catch (err) {
      console.error("❌ duplicateProject error:", err);
      toast.error("Erreur lors de la duplication.");
    } finally {
      setDuplicating(null);
    }
  }

  useEffect(() => {
    fetchTemplates();
  }, []);

  /* === Render === */
  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6 text-indigo-600">
          🛠️ Templates publics
        </h1>

        {loading ? (
          <div
            className="flex justify-center items-center py-20 text-indigo-500"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="animate-spin w-6 h-6 mr-2" />
            Chargement des templates...
          </div>
        ) : templates.length === 0 ? (
          <p className="text-gray-400">Aucun template disponible pour l’instant.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((tpl) => (
              <Card
                key={tpl.id}
                className="hover:shadow-lg transition cursor-pointer focus-within:ring-2 focus-within:ring-indigo-500"
                onClick={() => navigate(`/marketplace/${tpl.id}`)} // ✅ clic carte = détails
              >
                <CardContent className="p-4 flex flex-col h-full justify-between">
                  {/* Header */}
                  <div className="flex justify-between items-start">
                    <h2
                      className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1 hover:text-indigo-600"
                      aria-label={`Ouvrir ${tpl.name}`}
                    >
                      {tpl.name}
                    </h2>
                    {user && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(tpl.id);
                        }}
                        className="p-1 rounded hover:bg-yellow-100 dark:hover:bg-slate-700"
                        aria-label={
                          isFavorite(tpl.id)
                            ? "Retirer des favoris"
                            : "Ajouter aux favoris"
                        }
                      >
                        <Star
                          className={`w-5 h-5 ${
                            isFavorite(tpl.id)
                              ? "fill-yellow-400 text-yellow-500"
                              : "text-gray-400"
                          }`}
                        />
                      </button>
                    )}
                  </div>

                  {/* Infos */}
                  <div className="flex gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" /> {tpl.owner?.email || "Anonyme"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(tpl.updatedAt).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                      tpl.status === "published"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {tpl.status}
                  </span>

                  {/* Actions */}
                  <div
                    className="mt-4 flex flex-wrap gap-2"
                    onClick={(e) => e.stopPropagation()} // ✅ évite navigation détails
                  >
                    <Link
                      to={`/preview/${tpl.shareId}`}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded"
                      aria-label="Aperçu public"
                    >
                      <Eye className="w-4 h-4" /> Aperçu
                    </Link>
                    <Link
                      to={`/marketplace/${tpl.id}`}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded"
                      aria-label="Détails du template"
                    >
                      <Info className="w-4 h-4" /> Détails
                    </Link>
                    {user && (
                      <Button
                        size="sm"
                        onClick={() => handleDuplicate(tpl.id)}
                        disabled={duplicating === tpl.id}
                        className="bg-pink-600 text-white hover:bg-pink-700"
                        aria-label="Dupliquer le template"
                      >
                        {duplicating === tpl.id ? (
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
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
