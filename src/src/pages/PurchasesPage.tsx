import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Loader2, Download, CheckCircle, XCircle, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

/* ============================================================================
 *  PurchasesPage – Historique des achats (templates / composants)
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
        <h1 className="text-2xl font-bold mb-6 text-indigo-600">🛒 Mes achats</h1>

        {loading ? (
          <div className="flex justify-center items-center py-20 text-indigo-500">
            <Loader2 className="animate-spin w-6 h-6 mr-2" />
            Chargement de vos achats...
          </div>
        ) : purchases.length === 0 ? (
          <p className="text-gray-400">Vous n’avez encore effectué aucun achat.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {purchases.map((p) => (
              <Card key={p.id} className="hover:shadow-lg transition">
                <CardContent className="p-4 flex flex-col h-full justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
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
