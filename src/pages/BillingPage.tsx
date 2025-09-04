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
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";

/* ============================================================================
 *  BillingPage – UInova v2 ultra-pro
 * ========================================================================== */
export default function BillingPage() {
  const [report, setReport] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");
  const toast = useToast();

  useEffect(() => {
    loadReport();
  }, [period]);

  async function loadReport() {
    setLoading(true);
    try {
      const [reportData, historyData] = await Promise.all([
        getUsageReport(),
        getUsageHistory?.(period) || Promise.resolve([]),
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
            💳 Facturation & Usage
          </h1>
          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
              <SelectTrigger className="w-32">
                {period === "7d" ? "7 jours" : period === "30d" ? "30 jours" : "90 jours"}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 jours</SelectItem>
                <SelectItem value="30d">30 jours</SelectItem>
                <SelectItem value="90d">90 jours</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={loadReport} variant="secondary">
              🔄 Rafraîchir
            </Button>
          </div>
        </div>

        {/* Plan actuel */}
        {report?.plan && (
          <Card title="📌 Plan actuel" className="bg-slate-50 dark:bg-slate-800">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">{report.plan}</span>
              <Button
                className="bg-indigo-600 text-white hover:bg-indigo-700"
                onClick={() => toast.info("🚀 Redirection vers la page Pricing")}
              >
                Gérer mon plan
              </Button>
            </div>
          </Card>
        )}

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
              <p className="text-2xl font-bold">{report.storageMB.toFixed(2)} MB</p>
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

        {/* Pas de données */}
        {!loading && !report && (
          <p className="text-gray-400 text-center italic">
            Aucun rapport disponible pour le moment.
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}
