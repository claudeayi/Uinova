import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { Eye, Download, Loader2, Star } from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useFavorites } from "@/context/FavoritesContext";
import axios from "axios";

/* ============================================================================
 *  ComponentsExplorer – Marketplace Composants
 * ========================================================================== */
interface ComponentItem {
  id: string;
  name: string;
  category?: string;
  preview?: string;
  updatedAt: string;
}

export default function ComponentsExplorer() {
  const [components, setComponents] = useState<ComponentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const { toggleFavorite, isFavorite } = useFavorites();

  async function fetchComponents() {
    setLoading(true);
    try {
      const res = await axios.get("/api/components");
      setComponents(res.data || []);
    } catch (err) {
      console.error("❌ fetchComponents error:", err);
      toast.error("Impossible de charger les composants.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchComponents();
  }, []);

  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6 text-indigo-600">
          🧩 Composants disponibles
        </h1>

        {loading ? (
          <div className="flex justify-center items-center py-20 text-indigo-500">
            <Loader2 className="animate-spin w-6 h-6 mr-2" />
            Chargement des composants...
          </div>
        ) : components.length === 0 ? (
          <p className="text-gray-400">Aucun composant disponible.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {components.map((c) => (
              <Card key={c.id} className="hover:shadow-lg transition">
                <CardContent className="p-4 flex flex-col h-full justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                      {c.name}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      {c.category || "Général"} •{" "}
                      {new Date(c.updatedAt).toLocaleDateString("fr-FR")}
                    </p>
                    {c.preview && (
                      <img
                        src={c.preview}
                        alt={c.name}
                        className="w-full h-32 object-cover rounded"
                      />
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => toast("👀 Preview du composant")}
                    >
                      <Eye className="w-4 h-4 mr-1" /> Preview
                    </Button>
                    <Button
                      size="sm"
                      className="bg-indigo-600 text-white hover:bg-indigo-700"
                      onClick={() => toast("➕ Ajouté à votre projet actif")}
                    >
                      <Download className="w-4 h-4 mr-1" /> Ajouter
                    </Button>
                    <Button
                      size="sm"
                      variant={isFavorite(c.id) ? "default" : "outline"}
                      onClick={() =>
                        toggleFavorite({
                          id: c.id,
                          type: "template",
                          name: c.name,
                          updatedAt: c.updatedAt,
                        })
                      }
                    >
                      <Star
                        className={`w-4 h-4 mr-1 ${
                          isFavorite(c.id) ? "text-yellow-400" : ""
                        }`}
                      />
                      {isFavorite(c.id) ? "Favori" : "Favoris"}
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
