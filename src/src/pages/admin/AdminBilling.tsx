// src/pages/admin/AdminBilling.tsx
import { useState, useEffect } from "react";
import { getAdminPayments, AdminPayment } from "@/services/admin";
import { getUsageReport } from "@/services/billing";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/layouts/DashboardLayout";
import { toast } from "react-hot-toast";

/* ============================================================================
 * AdminBilling – Facturation & Paiements centralisés
 * Onglets :
 *  - Paiements (liste filtrable/paginée)
 *  - Analytics (stats synthétiques)
 *  - Usage (consommation API, stockage, projets)
 * ========================================================================= */
export default function AdminBilling() {
  const [tab, setTab] = useState<"payments" | "analytics" | "usage">("payments");

  // Paiements
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [status, setStatus] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Usage
  const [usage, setUsage] = useState<any>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);

  // =================== Fetch ===================
  async function fetchPayments() {
    try {
      setLoadingPayments(true);
      const data = await getAdminPayments();
      setPayments(data || []);
    } catch (err) {
      console.error("❌ Paiements error:", err);
      toast.error("Impossible de charger les paiements.");
    } finally {
      setLoadingPayments(false);
    }
  }

  async function fetchUsage() {
    try {
      setLoadingUsage(true);
      const data = await getUsageReport();
      setUsage(data);
    } catch (err) {
      console.error("❌ Usage error:", err);
      toast.error("Impossible de charger l’usage.");
    } finally {
      setLoadingUsage(false);
    }
  }

  useEffect(() => {
    if (tab === "payments") fetchPayments();
    if (tab === "usage") fetchUsage();
  }, [tab]);

  // =================== Helpers ===================
  const filtered = payments.filter((p) =>
    status === "ALL" ? true : p.status === status
  );
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "SUCCEEDED":
        return "bg-green-100 text-green-700";
      case "FAILED":
        return "bg-red-100 text-red-700";
      case "PENDING":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  // =================== Render ===================
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Tabs */}
        <div className="flex gap-4 border-b">
          <button
            onClick={() => setTab("payments")}
            className={`px-4 py-2 font-semibold ${
              tab === "payments"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500"
            }`}
          >
            💳 Paiements
          </button>
          <button
            onClick={() => setTab("analytics")}
            className={`px-4 py-2 font-semibold ${
              tab === "analytics"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500"
            }`}
          >
            📊 Analytics
          </button>
          <button
            onClick={() => setTab("usage")}
            className={`px-4 py-2 font-semibold ${
              tab === "usage"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500"
            }`}
          >
            📡 Usage & Facturation
          </button>
        </div>

        {/* Content */}
        {tab === "payments" && (
          <Card>
            <CardContent className="p-4">
              <header className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Historique des paiements</h2>
                <div className="flex gap-2 items-center">
                  <select
                    value={status}
                    onChange={(e) => {
                      setStatus(e.target.value);
                      setPage(1);
                    }}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    <option value="ALL">Tous</option>
                    <option value="SUCCEEDED">Réussis</option>
                    <option value="FAILED">Échoués</option>
                    <option value="PENDING">En attente</option>
                  </select>
                  <Button size="sm" onClick={fetchPayments}>
                    🔄 Rafraîchir
                  </Button>
                </div>
              </header>

              {loadingPayments ? (
                <p className="text-gray-500">⏳ Chargement...</p>
              ) : paginated.length === 0 ? (
                <p className="text-center text-gray-500 py-10">
                  Aucun paiement trouvé.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-100 text-left">
                        <th className="p-2 border">Utilisateur</th>
                        <th className="p-2 border">Montant</th>
                        <th className="p-2 border">Devise</th>
                        <th className="p-2 border">Statut</th>
                        <th className="p-2 border">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((p) => (
                        <tr key={p.id} className="border-b hover:bg-gray-50">
                          <td className="p-2 font-mono text-xs">{p.userId}</td>
                          <td className="p-2 font-semibold">{p.amount}</td>
                          <td className="p-2">{p.currency}</td>
                          <td className="p-2">
                            <span
                              className={`px-2 py-1 text-xs rounded ${getStatusBadge(
                                p.status
                              )}`}
                            >
                              {p.status}
                            </span>
                          </td>
                          <td className="p-2">
                            {new Date(p.createdAt).toLocaleString("fr-FR")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-4 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    ← Précédent
                  </Button>
                  <span className="px-2 py-1 text-sm">
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
            </CardContent>
          </Card>
        )}

        {tab === "analytics" && (
          <Card>
            <CardContent className="p-6 grid md:grid-cols-3 gap-4">
              <div className="p-4 rounded bg-green-100">
                <h3 className="font-semibold">Revenus totaux</h3>
                <p className="text-2xl">12 450 €</p>
              </div>
              <div className="p-4 rounded bg-blue-100">
                <h3 className="font-semibold">Paiements réussis</h3>
                <p className="text-2xl">318</p>
              </div>
              <div className="p-4 rounded bg-red-100">
                <h3 className="font-semibold">Échecs</h3>
                <p className="text-2xl">21</p>
              </div>
            </CardContent>
          </Card>
        )}

        {tab === "usage" && (
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">📡 Consommation</h2>
              {loadingUsage ? (
                <p className="text-gray-500">⏳ Chargement...</p>
              ) : usage ? (
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 rounded bg-indigo-50">
                    <h3 className="font-semibold">Appels API</h3>
                    <p className="text-2xl">{usage.api}</p>
                  </div>
                  <div className="p-4 rounded bg-indigo-50">
                    <h3 className="font-semibold">Projets</h3>
                    <p className="text-2xl">{usage.projects}</p>
                  </div>
                  <div className="p-4 rounded bg-indigo-50">
                    <h3 className="font-semibold">Stockage</h3>
                    <p className="text-2xl">{usage.storageMB} MB</p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">Aucune donnée usage.</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
