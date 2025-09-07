import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Eye,
  Loader2,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  ShoppingBag,
  Filter,
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

/* ============================================================================
 *  PurchasesPage – UInova v3 ultra-pro
 * ========================================================================== */
interface Purchase {
  id: string;
  itemId: string;
  type: "template" | "component";
  name: string;
  status: "paid" | "pending" | "failed";
  createdAt: string;
  price?: number; // 💰 enrichi avec prix
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "paid" | "pending" | "failed">("all");
  const [sort, setSort] = useState<"desc" | "asc">("desc");
  const navigate = useNavigate();

  async function fetchPurchases() {
    setLoading(true);
    try {
      const res = await axios.get("/api/purchases");
      setPurchases(res.data || []);
    } catch (err) {
      console.error("❌ fetchPurchases error:", err);
      toast.error("Impossible de charger vos achats.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPurchases();
  }, []);

  /* === Filtrage + tri === */
  const filtered = useMemo(() => {
    let data = purchases.filter(
      (p) =>
        (filter === "all" || p.status === filter) &&
        (p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.type.toLowerCase().includes(search.toLowerCase()))
    );
    return data.sort((a, b) =>
      sort === "desc"
        ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [purchases, search, filter, sort]);

  /* === Stats === */
  const stats = useMemo(() => {
    return {
      total: purchases.length,
      paid: purchases.filter((p) => p.status === "paid").length,
      pending: purchases.filter((p) => p.status === "pending").length,
      failed: purchases.filter((p) => p.status === "failed").length,
      spent: purchases
        .filter((p) => p.status === "paid" && p.price)
        .reduce((sum, p) => sum + (p.price || 0), 0),
      last: purchases.length > 0 ? purchases[0].createdAt : null,
    };
  }, [purchases]);

  function statusBadge(status: Purchase["status"]) {
    switch (status) {
      case "paid":
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
            <CheckCircle className="w-3 h-3" /> Payé
          </span>
        );
      case "pending":
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700">
            <Clock className="w-3 h-3" /> En attente
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">
            <XCircle className="w-3 h-3" /> Échoué
          </span>
        );
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-bold text-indigo-600 flex items-center gap-2">
            🛒 Mes Achats
          </h1>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-2 rounded border dark:bg-slate-900 dark:border-slate-700 text-sm"
              />
            </div>
            <Button variant="outline" onClick={() => setFilter("all")}>
              <Filter className="w-4 h-4 mr-1" /> {filter}
            </Button>
            <Button variant="outline" onClick={() => setSort(sort === "desc" ? "asc" : "desc")}>
              {sort === "desc" ? <ArrowDownWideNarrow className="w-4 h-4 mr-1" /> : <ArrowUpWideNarrow className="w-4 h-4 mr-1" />}
              {sort === "desc" ? "Récent" : "Ancien"}
            </Button>
          </div>
        </div>

        {/* Résumé */}
        {purchases.length > 0 && (
          <div className="flex flex-wrap gap-3 text-xs">
            <Badge label={`Total : ${stats.total}`} color="blue" />
            <Badge label={`Payés : ${stats.paid}`} color="green" />
            <Badge label={`En attente : ${stats.pending}`} color="yellow" />
            <Badge label={`Échoués : ${stats.failed}`} color="red" />
            <Badge label={`Dépensé : ${stats.spent} €`} color="indigo" />
          </div>
        )}

        {/* Contenu */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-6 bg-gray-300 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-20 space-y-4">
            <p className="italic">Aucun achat trouvé.</p>
            <Link
              to="/marketplace"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
            >
              <ShoppingBag className="w-4 h-4" /> Explorer Marketplace
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((p) => (
              <Card key={p.id} className="hover:shadow-lg transition">
                <CardContent className="p-4 flex flex-col h-full justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1 truncate">
                      {p.name}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      {p.type === "template" ? "Template" : "Composant"} •{" "}
                      {new Date(p.createdAt).toLocaleDateString("fr-FR")}
                    </p>
                    {statusBadge(p.status)}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        navigate(
                          p.type === "template"
                            ? `/marketplace/${p.itemId}`
                            : `/marketplace/components/${p.itemId}`
                        )
                      }
                    >
                      <Eye className="w-4 h-4 mr-1" /> Voir
                    </Button>
                    {p.status === "paid" && (
                      <Button
                        size="sm"
                        className="bg-indigo-600 text-white hover:bg-indigo-700"
                        onClick={() =>
                          window.confirm("Ajouter cet achat à vos projets ?") &&
                          toast.success("✅ Ajouté à vos projets")
                        }
                      >
                        <Download className="w-4 h-4 mr-1" /> Réutiliser
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

/* ============================================================================
 *  Badge utilitaire
 * ========================================================================== */
function Badge({
  label,
  color,
}: {
  label: string;
  color: "blue" | "green" | "yellow" | "red" | "indigo";
}) {
  const colors = {
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200",
    green: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200",
    yellow: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200",
    red: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200",
    indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
      {label}
    </span>
  );
}
