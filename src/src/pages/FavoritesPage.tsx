import { useFavorites } from "@/context/FavoritesContext";
import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Loader2, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";

interface Template {
  id: string;
  shareId: string;
  name: string;
  updatedAt: string;
}

export default function FavoritesPage() {
  const { favorites } = useFavorites();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchFavorites() {
    setLoading(true);
    try {
      const res = await axios.get("/api/templates");
      const favs = res.data.filter((tpl: Template) =>
        favorites.includes(tpl.id)
      );
      setTemplates(favs);
    } catch (err) {
      console.error("❌ fetchFavorites error:", err);
      toast.error("Impossible de charger vos favoris.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFavorites();
  }, [favorites]);

  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-yellow-600 mb-6">⭐ Mes Favoris</h1>

        {loading ? (
          <div className="flex justify-center items-center py-20 text-indigo-500">
            <Loader2 className="animate-spin w-6 h-6 mr-2" /> Chargement...
          </div>
        ) : templates.length === 0 ? (
          <p className="text-gray-400">Aucun template en favori.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((tpl) => (
              <Card key={tpl.id}>
                <CardContent className="p-4 flex flex-col justify-between h-full">
                  <h2 className="text-lg font-semibold">{tpl.name}</h2>
                  <p className="text-xs text-gray-500">
                    {new Date(tpl.updatedAt).toLocaleDateString("fr-FR")}
                  </p>
                  <Link
                    to={`/preview/${tpl.shareId}`}
                    className="mt-3 flex items-center gap-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                  >
                    <Eye className="w-4 h-4" /> Voir
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
