import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Eye, Download, Loader2, Star, Pencil } from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useFavorites } from "@/context/FavoritesContext";
import { duplicateProject } from "@/services/projects";

/* ============================================================================
 *  FavoritesPage – UInova v1
 *  ✅ Liste des projets + templates favoris
 *  ✅ Preview rapide, Éditer, Dupliquer
 *  ✅ Intégration avec FavoritesContext
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

  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-indigo-600 mb-6 flex items-center gap-2">
          <Star className="w-6 h-6 text-yellow-500" /> Mes Favoris
        </h1>

        {loading ? (
          <div className="flex justify-center items-center py-20 text-indigo-500">
            <Loader2 className="animate-spin w-6 h-6 mr-2" />
            Chargement de vos favoris...
          </div>
        ) : favorites.length === 0 ? (
          <p className="text-gray-400 italic">
            Aucun favori enregistré. Ajoutez des projets ou templates ⭐ à vos favoris.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((fav) => (
              <Card
                key={fav.id}
                className="hover:shadow-lg transition"
              >
                <CardContent className="p-4 flex flex-col h-full justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1">
                      {fav.name}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      {fav.type === "project" ? "Projet" : "Template"} •{" "}
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
