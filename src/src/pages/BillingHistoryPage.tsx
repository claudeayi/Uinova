import { useEffect, useState } from "react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { toast } from "react-hot-toast";

interface Payment {
  id: string;
  provider: "stripe" | "paypal" | "cinetpay";
  amount: number;
  currency: string;
  status: "SUCCEEDED" | "FAILED" | "PENDING";
  createdAt: string;
  invoiceUrl?: string;
}

export default function BillingHistoryPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchPayments() {
    try {
      setLoading(true);
      const res = await axios.get("/api/payments/history", {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      });
      setPayments(res.data || []);
    } catch (err) {
      console.error("❌ fetchPayments error:", err);
      toast.error("Impossible de charger l’historique des paiements.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPayments();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
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

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold">📑 Historique des paiements</h1>

        {loading ? (
          <p className="text-gray-500">⏳ Chargement...</p>
        ) : payments.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-gray-500">
              Aucun paiement enregistré.
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-md rounded-2xl">
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100 dark:bg-slate-800 text-left">
                    <th className="p-3 border">Date</th>
                    <th className="p-3 border">Montant</th>
                    <th className="p-3 border">Devise</th>
                    <th className="p-3 border">Provider</th>
                    <th className="p-3 border">Statut</th>
                    <th className="p-3 border text-center">Facture</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
                    >
                      <td className="p-3">
                        {new Date(p.createdAt).toLocaleString("fr-FR")}
                      </td>
                      <td className="p-3 font-medium">{p.amount}</td>
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
                      <td className="p-3 text-center">
                        {p.invoiceUrl ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(p.invoiceUrl, "_blank")}
                          >
                            📄 Télécharger
                          </Button>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
