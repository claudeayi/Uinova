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
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

/* ============================================================================
 *  PurchasesPage – UInova v2 ultra-pro
 * ========================================================================== */
interface Purchase {
  id: string;
  itemId: string;
  type: "template" | "component";
  name: string;
  status: "paid" | "pending" | "failed";
  createdAt: string;
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
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

  /* === Filtrage recherche === */
  const filtered = useMemo(() => {
    return purchases.filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.type.toLowerCase().includes(search.toLowerCase()) ||
        p.status.toLowerCase().includes(search.toLowerCase())
    );
  }, [purchases, search]);

  /* === Stats === */
  const stats = useMemo(() => {
    return {
      total: purchases.length,
      paid: purchases.filter((p) => p.status === "paid").length,
      pending: purchases.filter((p) => p.status === "pending").length,
      failed: purchases.filter((p) => p.status === "failed").length,
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
      <div className="p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold text-indigo-600 flex items-center gap-2">
            🛒 Mes Achats
          </h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un achat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 rounded border dark:bg-slate-900 dark:border-slate-700 text-sm"
            />
          </div>
        </div>

        {/* Résumé */}
        {purchases.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-3 text-xs">
            <Badge label={`Total : ${stats.total}`} color="blue" />
            <Badge label={`Payés : ${stats.paid}`} color="green" />
            <Badge label={`En attente : ${stats.pending}`} color="yellow" />
            <Badge label={`Échoués : ${stats.failed}`} color="red" />
          </div>
        )}

        {/* Contenu */}
        {loading ? (
          <div className="flex justify-center items-center py-20 text-indigo-500">
            <Loader2 className="animate-spin w-6 h-6 mr-2" />
            Chargement de vos achats...
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
                        onClick={() => toast.success("✅ Ajouté à vos projets")}
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
  color: "blue" | "green" | "yellow" | "red";
}) {
  const colors = {
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200",
    green: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200",
    yellow: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200",
    red: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
      {label}
    </span>
  );
}
