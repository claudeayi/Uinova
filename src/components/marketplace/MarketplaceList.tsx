import { useEffect, useState } from "react";
import { getMarketplaceItems } from "@/services/marketplace";
import { Loader2, ShoppingCart, Star } from "lucide-react";

export default function MarketplaceList() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchItems() {
      try {
        const res = await getMarketplaceItems();
        setItems(res);
      } catch (err) {
        console.error("❌ Erreur marketplace:", err);
        setError("Impossible de charger les items pour le moment.");
      } finally {
        setLoading(false);
      }
    }
    fetchItems();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-busy="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="animate-pulse bg-gray-800 rounded-lg p-4 h-40" />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  if (items.length === 0) {
    return <p className="text-gray-400">Aucun élément disponible pour le moment.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition overflow-hidden"
        >
          {item.image && (
            <img
              src={item.image}
              alt={item.title}
              className="h-40 w-full object-cover"
            />
          )}
          <div className="flex-1 p-4 flex flex-col">
            <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
              {item.title}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm flex-1 mt-1">
              {item.description}
            </p>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-blue-600 dark:text-blue-400 font-semibold">
                {item.price ? `${item.price} €` : "Gratuit"}
              </span>
              {item.rating && (
                <span className="flex items-center text-yellow-400 text-sm">
                  <Star className="w-4 h-4 mr-1 fill-current" /> {item.rating}
                </span>
              )}
            </div>

            <button
              className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition"
            >
              <ShoppingCart className="w-4 h-4" />
              {item.price ? "Acheter" : "Obtenir"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
