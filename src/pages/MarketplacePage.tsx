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
  type?: string; // template | component
}

export default function MarketplacePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 9;

  async function fetchItems() {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get("/api/marketplace/items", {
        params: { q: search },
      });
      setItems(res.data.items || res.data.data || []);
    } catch (err) {
      console.error("❌ Erreur marketplace:", err);
      setError("Impossible de charger les items.");
      toast.error("❌ Erreur lors du chargement de la marketplace");
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

  // Pagination
  const totalPages = Math.ceil(items.length / pageSize);
  const paginated = items.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold">🛒 Marketplace UInova</h1>

      {/* Barre recherche */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="🔍 Rechercher un template ou composant..."
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
        {paginated.map((item) => (
          <div
            key={item.id}
            className="p-4 rounded-lg shadow bg-white dark:bg-slate-800 border hover:shadow-xl hover:-translate-y-1 transition flex flex-col"
          >
            <h2 className="text-lg font-semibold mb-1">{item.title}</h2>
            <p className="text-sm text-gray-500 line-clamp-3 flex-1">
              {item.description || "Pas de description."}
            </p>

            <div className="mt-3 text-xs text-gray-400">
              👤 {item.owner?.email || "Anonyme"} <br />
              📅 {new Date(item.createdAt).toLocaleDateString()}
            </div>

            <div className="mt-4 flex justify-between items-center">
              <span
                className={`px-2 py-1 rounded text-sm font-semibold ${
                  item.priceCents
                    ? "bg-green-100 text-green-600"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {item.priceCents
                  ? (item.priceCents / 100).toFixed(2) + " " + item.currency
                  : "Gratuit"}
              </span>
              <div className="flex gap-2">
                <Link
                  to={`/marketplace/${item.id}`}
                  className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  👁️ Voir
                </Link>
                <button
                  onClick={() => handleBuy(item.id)}
                  className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                  💳 Acheter
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-3 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            ← Précédent
          </button>
          <span>
            Page {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Suivant →
          </button>
        </div>
      )}
    </div>
  );
}
