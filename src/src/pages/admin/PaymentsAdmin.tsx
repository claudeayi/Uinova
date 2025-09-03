import { useEffect, useState } from "react";
import { getAdminPayments, AdminPayment } from "@/services/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import DashboardLayout from "@/layouts/DashboardLayout";

export default function PaymentsAdmin() {
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("ALL");
  const [provider, setProvider] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  async function fetchPayments() {
    try {
      setLoading(true);
      const data = await getAdminPayments();
      setPayments(data || []);
    } catch (err) {
      console.error("❌ Erreur chargement paiements:", err);
      toast.error("Impossible de charger les paiements.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPayments();
  }, []);

  // 🔎 Filtrage multi-critères
  const filtered = payments.filter(
    (p) =>
      (p.user?.email || p.userId || "")
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (status === "ALL" || p.status === status) &&
      (provider === "ALL" || p.provider === provider)
  );

  // Pagination
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

  if (loading) {
    return (
      <DashboardLayout>
        <p className="p-6 text-gray-500">⏳ Chargement des paiements...</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-bold">💳 Gestion des paiements</h1>
          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="text"
              placeholder="🔍 Rechercher par email ou ID utilisateur..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="border rounded px-3 py-2 w-full md:w-72 dark:bg-slate-900 dark:border-slate-700"
            />
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="border rounded px-2 py-2 text-sm dark:bg-slate-900 dark:border-slate-700"
            >
              <option value="ALL">Tous statuts</option>
              <option value="SUCCEEDED">✅ Réussis</option>
              <option value="FAILED">❌ Échoués</option>
              <option value="PENDING">⏳ En attente</option>
            </select>
            <select
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value);
                setPage(1);
              }}
              className="border rounded px-2 py-2 text-sm dark:bg-slate-900 dark:border-slate-700"
            >
              <option value="ALL">Tous providers</option>
              <option value="stripe">Stripe</option>
              <option value="paypal">PayPal</option>
              <option value="cinetpay">CinetPay</option>
            </select>
            <Button onClick={fetchPayments}>🔄 Rafraîchir</Button>
          </div>
        </header>

        <p className="text-sm text-gray-500">
          {filtered.length} paiement(s) trouvé(s)
        </p>

        {/* Tableau */}
        <Card className="shadow-md rounded-2xl">
          <CardContent className="overflow-x-auto p-0">
            {paginated.length === 0 ? (
              <p className="text-center text-gray-500 py-10">
                Aucun paiement trouvé.
              </p>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100 dark:bg-slate-800 text-left">
                    <th className="p-3 border">Utilisateur</th>
                    <th className="p-3 border">Montant</th>
                    <th className="p-3 border">Devise</th>
                    <th className="p-3 border">Provider</th>
                    <th className="p-3 border">Statut</th>
                    <th className="p-3 border">Date</th>
                    <th className="p-3 border text-center">Facture</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
                    >
                      <td className="p-3 font-mono text-xs">
                        {p.user?.email || p.userId || "—"}
                      </td>
                      <td className="p-3 font-semibold">
                        {new Intl.NumberFormat("fr-FR", {
                          style: "currency",
                          currency: p.currency,
                        }).format(p.amount)}
                      </td>
                      <td className="p-3">{p.currency}</td>
                      <td className="p-3 capitalize">{p.provider}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 text-xs rounded font-semibold ${getStatusBadge(
                            p.status
                          )}`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="p-3">
                        {new Date(p.createdAt).toLocaleString("fr-FR")}
                      </td>
                      <td className="p-3 text-center">
                        {p.invoiceUrl ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(p.invoiceUrl, "_blank")}
                          >
                            📄 Voir
                          </Button>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
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
