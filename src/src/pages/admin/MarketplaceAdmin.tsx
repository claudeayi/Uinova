// src/pages/admin/MarketplaceAdmin.tsx
import { useEffect, useState } from "react";
import { getAllMarketplaceItems, deleteMarketplaceItem, AdminMarketplaceItem } from "@/services/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/layouts/DashboardLayout";
import { toast } from "react-hot-toast";

export default function MarketplaceAdmin() {
  const [items, setItems] = useState<AdminMarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | "TEMPLATE" | "COMPONENT" | "FREE">("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  async function fetchItems() {
    try {
      setLoading(true);
      const data = await getAllMarketplaceItems();
      setItems(data || []);
    } catch (err) {
      console.error("❌ Erreur chargement marketplace:", err);
      toast.error("Impossible de charger les items.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(itemId: string) {
    if (!window.confirm("⚠️ Supprimer cet item définitivement ?")) return;
    try {
      await deleteMarketplaceItem(itemId);
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      toast.success("🗑️ Item supprimé");
    } catch (err) {
      console.error("❌ Erreur suppression:", err);
      toast.error("Impossible de supprimer cet item.");
    }
  }

  useEffect(() => {
    fetchItems();
  }, []);

  // 🔎 Filtrage
  const filtered = items.filter((i) => {
    const matchSearch =
      i.title.toLowerCase().includes(search.toLowerCase()) ||
      (i.owner?.email || "").toLowerCase().includes(search.toLowerCase());

    const matchFilter =
      filter === "ALL"
        ? true
        : filter === "FREE"
        ? i.priceCents === 0
        : i.type?.toUpperCase() === filter;

    return matchSearch && matchFilter;
  });

  // Pagination
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  if (loading) {
    return (
      <DashboardLayout>
        <p className="p-6 text-gray-500">⏳ Chargement marketplace...</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-bold">🛒 Gestion Marketplace</h1>
          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="text"
              placeholder="Rechercher par titre ou vendeur..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="border rounded px-3 py-2 w-full md:w-72 dark:bg-slate-900 dark:border-slate-700"
            />
            <select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value as any);
                setPage(1);
              }}
              className="border rounded px-2 py-2 text-sm dark:bg-slate-900 dark:border-slate-700"
            >
              <option value="ALL">Tous</option>
              <option value="TEMPLATE">Templates</option>
              <option value="COMPONENT">Composants</option>
              <option value="FREE">Gratuits</option>
            </select>
            <Button onClick={fetchItems}>🔄 Rafraîchir</Button>
          </div>
        </header>

        <p className="text-sm text-gray-500">
          {filtered.length} item(s) trouvé(s)
        </p>

        {/* Tableau */}
        <Card className="shadow-md rounded-2xl">
          <CardContent className="overflow-x-auto p-0">
            {paginated.length === 0 ? (
              <p className="text-center text-gray-500 py-10">
                Aucun item trouvé.
              </p>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100 dark:bg-slate-800 text-left">
                    <th className="p-3 border">Titre</th>
                    <th className="p-3 border">Type</th>
                    <th className="p-3 border">Prix</th>
                    <th className="p-3 border">Vendeur</th>
                    <th className="p-3 border">Créé le</th>
                    <th className="p-3 border text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((i) => (
                    <tr
                      key={i.id}
                      className="border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
                    >
                      <td className="p-3 font-medium">{i.title}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 text-xs rounded font-semibold ${
                            i.type === "template"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-purple-100 text-purple-700"
                          }`}
                        >
                          {i.type || "—"}
                        </span>
                      </td>
                      <td className="p-3">
                        {i.priceCents === 0
                          ? "Gratuit"
                          : `${(i.priceCents / 100).toFixed(2)} ${
                              i.currency || "EUR"
                            }`}
                      </td>
                      <td className="p-3">{i.owner?.email || "—"}</td>
                      <td className="p-3">
                        {new Date(i.createdAt).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(i.id)}
                        >
                          🗑️ Supprimer
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-4 space-x-2">
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              ← Précédent
            </Button>
            <span className="px-3 py-1">
              Page {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Suivant →
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
