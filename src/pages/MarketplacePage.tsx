// src/pages/MarketplacePage.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, Eye, Filter, Tag } from "lucide-react";

/* ===============================
   Interfaces
=============================== */
interface Item {
  id: string;
  title: string;
  description?: string;
  priceCents: number;
  currency: string;
  owner?: { email: string };
  createdAt: string;
  type?: string; // template | component
  purchased?: boolean;
}

/* ===============================
   Marketplace Page
=============================== */
export default function MarketplacePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<"all" | "template" | "component" | "free">("all");
  const [buying, setBuying] = useState<string | null>(null);
  const pageSize = 9;
  const navigate = useNavigate();

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

  async function handleBuy(item: Item) {
    if (item.purchased) {
      toast("✅ Déjà installé");
      return;
    }

    if (item.priceCents > 0) {
      // 🔀 Redirection vers page paiement
      navigate(`/payment?plan=${item.id}`);
      return;
    }

    // Gratuit → installation directe
    try {
      setBuying(item.id);
      await axios.post(
        "/api/marketplace/purchase",
        { itemId: item.id },
        { headers: { Authorization: "Bearer " + localStorage.getItem("token") } }
      );
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, purchased: true } : i))
      );
      toast.success("🎉 Ajout réussi !");
    } catch {
      toast.error("Impossible d’installer cet item.");
    } finally {
      setBuying(null);
    }
  }

  // Pagination
  const filtered = items.filter((item) => {
    if (filter === "template") return item.type === "template";
    if (filter === "component") return item.type === "component";
    if (filter === "free") return item.priceCents === 0;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <h1 className="text-3xl font-bold">🛒 Marketplace UInova</h1>
          <div className="flex gap-2">
            <FilterButton label="Tous" active={filter === "all"} onClick={() => setFilter("all")} />
            <FilterButton label="Templates" active={filter === "template"} onClick={() => setFilter("template")} />
            <FilterButton label="Composants" active={filter === "component"} onClick={() => setFilter("component")} />
            <FilterButton label="Gratuits" active={filter === "free"} onClick={() => setFilter("free")} />
          </div>
        </div>

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
        {!loading && !error && filtered.length === 0 && (
          <p className="text-gray-400">Aucun item trouvé.</p>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginated.map((item) => (
            <Card
              key={item.id}
              className="hover:shadow-lg transition hover:-translate-y-1"
            >
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div>
                  <h2 className="text-lg font-semibold mb-1">{item.title}</h2>
                  <p className="text-sm text-gray-500 line-clamp-3 flex-1">
                    {item.description || "Pas de description."}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <Badge
                      label={item.type === "template" ? "Template" : "Composant"}
                      color={item.type === "template" ? "blue" : "purple"}
                    />
                    {item.priceCents === 0 && <Badge label="Gratuit" color="green" />}
                    {item.owner?.email && (
                      <span className="text-gray-400">👤 {item.owner.email}</span>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex justify-between items-center">
                  <span
                    className={`px-2 py-1 rounded text-sm font-semibold ${
                      item.priceCents
                        ? "bg-green-100 text-green-700"
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
                      className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center gap-1"
                    >
                      <Eye size={14} /> Voir
                    </Link>
                    <button
                      onClick={() => handleBuy(item)}
                      disabled={!!buying && buying === item.id}
                      className={`px-3 py-1 text-sm rounded flex items-center gap-1 ${
                        item.purchased
                          ? "bg-gray-400 text-white cursor-not-allowed"
                          : "bg-purple-600 text-white hover:bg-purple-700"
                      }`}
                    >
                      <ShoppingCart size={14} />
                      {buying === item.id
                        ? "⏳..."
                        : item.purchased
                        ? "Installé"
                        : item.priceCents > 0
                        ? "Acheter"
                        : "Installer"}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
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
    </DashboardLayout>
  );
}

/* ===============================
   UI Components
=============================== */
function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${
        active
          ? "bg-indigo-600 text-white"
          : "bg-slate-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300"
      }`}
    >
      <Filter size={14} /> {label}
    </button>
  );
}

function Badge({ label, color }: { label: string; color: "blue" | "purple" | "green" }) {
  const colors = {
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200",
    purple: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200",
    green: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${colors[color]}`}
    >
      <Tag size={12} /> {label}
    </span>
  );
}
