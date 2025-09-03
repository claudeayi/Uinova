// src/pages/BillingPage.tsx
import { useEffect, useState } from "react";
import { getUsageReport, getUsageHistory } from "@/services/billing";
import { Card } from "@/components/advanced/Card";
import { useToast } from "@/hooks/useToast";
import DashboardLayout from "@/layouts/DashboardLayout";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

export default function BillingPage() {
  const [report, setReport] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    loadReport();
  }, []);

  async function loadReport() {
    setLoading(true);
    try {
      const [reportData, historyData] = await Promise.all([
        getUsageReport(),
        getUsageHistory?.() || Promise.resolve([]),
      ]);
      setReport(reportData);
      setHistory(historyData);
    } catch (e: any) {
      console.error("❌ BillingPage error:", e);
      toast.error("Impossible de charger le rapport d’usage.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">
            💳 Facturation & Usage
          </h1>
          <button
            onClick={loadReport}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            🔄 Rafraîchir
          </button>
        </div>

        {/* Chargement */}
        {loading && (
          <div className="flex justify-center items-center py-20 text-indigo-500">
            <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
            <span className="ml-3">Chargement des données...</span>
          </div>
        )}

        {/* Résumé usage */}
        {report && !loading && (
          <div className="grid gap-6 md:grid-cols-3">
            <Card title="⚡ API Calls">
              <p className="text-2xl font-bold">{report.api}</p>
            </Card>
            <Card title="📂 Projets">
              <p className="text-2xl font-bold">{report.projects}</p>
            </Card>
            <Card title="💾 Stockage">
              <p className="text-2xl font-bold">
                {report.storageMB.toFixed(2)} MB
              </p>
            </Card>
          </div>
        )}

        {/* Historique graphique */}
        {history.length > 0 && (
          <Card title="📈 Historique de consommation">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={history}>
                <Line type="monotone" dataKey="api" stroke="#4F46E5" />
                <Line type="monotone" dataKey="storageMB" stroke="#10B981" />
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
