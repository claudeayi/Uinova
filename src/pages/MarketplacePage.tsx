// src/pages/MarketplacePage.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

interface Item {
  id: string;
  title: string;
  description?: string;
  priceCents: number;
  currency: string;
  owner?: { email: string };
  createdAt: string;
}

export default function MarketplacePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  async function fetchItems() {
    try {
      setLoading(true);
      const res = await axios.get("/api/marketplace/items", {
        params: { q: search },
      });
      setItems(res.data.items || res.data.data || []);
    } catch (err) {
      setError("Impossible de charger les items.");
      toast.error("❌ Erreur marketplace");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchItems();
  }, []);

  const handleBuy = async (id: string) => {
    try {
      await axios.post(
        "/api/marketplace/purchase",
        { itemId: id },
        { headers: { Authorization: "Bearer " + localStorage.getItem("token") } }
      );
      toast.success("🎉 Achat réussi !");
    } catch {
      toast.error("Impossible d’acheter cet item.");
    }
  };

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">🛒 Marketplace UInova</h1>

      {/* Barre recherche */}
      <div className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Rechercher un template..."
          className="flex-1 px-3 py-2 rounded border dark:bg-slate-900 dark:border-slate-700"
        />
        <button
          onClick={fetchItems}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Rechercher
        </button>
      </div>

      {/* Loading / Error */}
      {loading && <p className="text-gray-500">⏳ Chargement des items...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {/* Liste des items */}
      {!loading && !error && items.length === 0 && (
        <p className="text-gray-400">Aucun item trouvé.</p>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => (
          <div
            key={item.id}
            className="p-4 rounded-lg shadow bg-white dark:bg-slate-800 border hover:shadow-lg transition"
          >
            <h2 className="text-lg font-semibold">{item.title}</h2>
            <p className="text-sm text-gray-500 line-clamp-3">
              {item.description || "Pas de description."}
            </p>

            <div className="mt-3 text-sm text-gray-400">
              Vendeur: {item.owner?.email || "Anonyme"} <br />
              Ajouté le {new Date(item.createdAt).toLocaleDateString()}
            </div>

            <div className="mt-4 flex justify-between items-center">
              <span className="font-bold text-blue-600">
                {(item.priceCents / 100).toFixed(2)} {item.currency}
              </span>
              <div className="flex gap-2">
                <Link
                  to={`/marketplace/${item.id}`}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                >
                  👁️ Voir
                </Link>
                <button
                  onClick={() => handleBuy(item.id)}
                  className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  💳 Acheter
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
