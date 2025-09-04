import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  Eye,
  Download,
  Loader2,
  Star,
  Pencil,
  Search,
  FolderOpen,
  Layers,
} from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useFavorites } from "@/context/FavoritesContext";
import { duplicateProject } from "@/services/projects";

/* ============================================================================
 *  FavoritesPage – UInova v2
 *  ✅ Liste + Recherche + Statistiques
 *  ✅ Preview rapide, Éditer, Dupliquer
 *  ✅ Intégration FavoritesContext ultra-pro
 * ========================================================================== */
interface FavoriteItem {
  id: string;
  type: "project" | "template";
  name: string;
  shareId?: string;
  updatedAt?: string;
}

export default function FavoritesPage() {
  const { favorites, fetchFavorites } = useFavorites();
  const [loading, setLoading] = useState(true);
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const navigate = useNavigate();

  async function handleDuplicate(id: string) {
    try {
      setDuplicating(id);
      const copy = await duplicateProject(id);
      if (copy) {
        toast.success("📂 Projet dupliqué depuis vos favoris !");
        navigate(`/editor/${copy.id}`);
      }
    } catch (err) {
      console.error("❌ handleDuplicate error:", err);
      toast.error("Erreur lors de la duplication.");
    } finally {
      setDuplicating(null);
    }
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      await fetchFavorites();
      setLoading(false);
    }
    load();
  }, []);

  /* === Recherche / Filtrage === */
  const filtered = useMemo(() => {
    return favorites.filter((f) =>
      f.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [favorites, search]);

  /* === Stats === */
  const stats = useMemo(() => {
    return {
      total: favorites.length,
      projects: favorites.filter((f) => f.type === "project").length,
      templates: favorites.filter((f) => f.type === "template").length,
    };
  }, [favorites]);

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold text-indigo-600 flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-500" /> Mes Favoris
          </h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un favori..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 rounded border dark:bg-slate-900 dark:border-slate-700 text-sm"
            />
          </div>
        </div>

        {/* Résumé stats */}
        {favorites.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-3 text-xs">
            <Badge label={`Total : ${stats.total}`} color="blue" />
            <Badge label={`Projets : ${stats.projects}`} color="green" />
            <Badge label={`Templates : ${stats.templates}`} color="yellow" />
          </div>
        )}

        {/* Contenu */}
        {loading ? (
          <div className="flex justify-center items-center py-20 text-indigo-500">
            <Loader2 className="animate-spin w-6 h-6 mr-2" />
            Chargement de vos favoris...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-20 space-y-4">
            <p className="italic">
              Aucun favori trouvé. Ajoutez des projets ou templates ⭐ à vos favoris.
            </p>
            <div className="flex justify-center gap-3">
              <Link
                to="/projects"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                <FolderOpen className="w-4 h-4" /> Mes Projets
              </Link>
              <Link
                to="/marketplace/templates"
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
              >
                <Layers className="w-4 h-4" /> Explorer Templates
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((fav) => (
              <Card key={fav.id} className="hover:shadow-lg transition">
                <CardContent className="p-4 flex flex-col h-full justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1 truncate">
                      {fav.name}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs mr-2 ${
                          fav.type === "project"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {fav.type}
                      </span>
                      {fav.updatedAt
                        ? new Date(fav.updatedAt).toLocaleDateString("fr-FR")
                        : "Date inconnue"}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {fav.shareId && (
                      <Link
                        to={`/preview/${fav.shareId}`}
                        className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded"
                      >
                        <Eye className="w-4 h-4" /> Aperçu
                      </Link>
                    )}
                    {fav.type === "project" && (
                      <Link
                        to={`/editor/${fav.id}`}
                        className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded"
                      >
                        <Pencil className="w-4 h-4" /> Éditer
                      </Link>
                    )}
                    <Button
                      size="sm"
                      onClick={() => handleDuplicate(fav.id)}
                      disabled={duplicating === fav.id}
                      className="bg-pink-600 text-white hover:bg-pink-700"
                    >
                      {duplicating === fav.id ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      ) : (
                        <Download className="w-4 h-4 mr-1" />
                      )}
                      Dupliquer
                    </Button>
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

/* ============================================================================
 *  Badge utilitaire
 * ========================================================================== */
function Badge({
  label,
  color,
}: {
  label: string;
  color: "blue" | "green" | "yellow";
}) {
  const colors = {
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200",
    green: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200",
    yellow: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
      {label}
    </span>
  );
}
