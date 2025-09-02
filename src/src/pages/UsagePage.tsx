import { useEffect, useState } from "react";
import { getUsage, getInvoices, UsageSummary } from "@/services/billing";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "react-hot-toast";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from "recharts";

export default function UsagePage() {
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [usageData, invoicesData] = await Promise.all([
          getUsage(),
          getInvoices(),
        ]);
        setUsage(usageData);
        setInvoices(invoicesData);
      } catch (err: any) {
        console.error(err);
        toast.error("Impossible de charger les données de facturation.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-indigo-500">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
        <span className="ml-3">Chargement des usages...</span>
      </div>
    );
  }

  if (!usage) {
    return (
      <div className="p-6 text-center text-gray-500">
        Aucune donnée d’usage disponible pour le moment.
      </div>
    );
  }

  const usageData = [
    { name: "API Calls", value: usage.apiCalls },
    { name: "Projets", value: usage.projects },
    { name: "Stockage (MB)", value: usage.storage },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">📊 Consommation & Facturation</h1>

      {/* Carte Résumé */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-md rounded-2xl">
          <CardContent className="p-6 text-center">
            <p className="text-gray-500">Appels API</p>
            <h2 className="text-xl font-semibold">{usage.apiCalls}</h2>
          </CardContent>
        </Card>

        <Card className="shadow-md rounded-2xl">
          <CardContent className="p-6 text-center">
            <p className="text-gray-500">Projets</p>
            <h2 className="text-xl font-semibold">{usage.projects}</h2>
          </CardContent>
        </Card>

        <Card className="shadow-md rounded-2xl">
          <CardContent className="p-6 text-center">
            <p className="text-gray-500">Stockage</p>
            <h2 className="text-xl font-semibold">{usage.storage} MB</h2>
          </CardContent>
        </Card>
      </div>

      {/* Graphique Barres */}
      <Card className="shadow-md rounded-2xl">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4">📈 Répartition actuelle</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={usageData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#4F46E5" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Factures */}
      <Card className="shadow-md rounded-2xl">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4">💳 Factures</h2>
          {invoices.length === 0 ? (
            <p className="text-gray-500">Aucune facture disponible.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-left">
                    <th className="p-3">Date</th>
                    <th className="p-3">Montant</th>
                    <th className="p-3">Statut</th>
                    <th className="p-3">Télécharger</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b">
                      <td className="p-3">{new Date(inv.date).toLocaleDateString()}</td>
                      <td className="p-3">{inv.amount} {inv.currency}</td>
                      <td className="p-3">{inv.status}</td>
                      <td className="p-3">
                        <a
                          href={inv.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:underline"
                        >
                          Télécharger
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
