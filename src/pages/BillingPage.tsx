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
 *  Types
 * ========================================================================== */
interface BillingReport {
  plan: "FREE" | "PRO" | "ENTERPRISE";
  api: number;
  projects: number;
  storageMB: number;
  quota?: { api: number; projects: number; storageMB: number }; // optionnel
}

interface UsageHistoryEntry {
  date: string;
  api: number;
  storageMB: number;
}

/* ============================================================================
 *  BillingPage – UInova v3 ultra-pro
 * ========================================================================== */
export default function BillingPage() {
  const [report, setReport] = useState<BillingReport | null>(null);
  const [history, setHistory] = useState<UsageHistoryEntry[]>([]);
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

  const planBadge = (plan: BillingReport["plan"]) => {
    const colors: Record<string, string> = {
      FREE: "bg-gray-200 text-gray-700",
      PRO: "bg-blue-200 text-blue-800",
      ENTERPRISE: "bg-yellow-200 text-yellow-800",
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-bold ${colors[plan]}`}>
        {plan}
      </span>
    );
  };

  const ProgressBar = ({
    value,
    max,
    color,
  }: {
    value: number;
    max?: number;
    color: string;
  }) => {
    const percent = max ? Math.min((value / max) * 100, 100) : 0;
    return (
      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded h-2 mt-2">
        <div
          className={`${color} h-2 rounded`}
          style={{ width: `${percent}%` }}
        />
      </div>
    );
  };

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
                {period === "7d"
                  ? "7 jours"
                  : period === "30d"
                  ? "30 jours"
                  : "90 jours"}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 jours</SelectItem>
                <SelectItem value="30d">30 jours</SelectItem>
                <SelectItem value="90d">90 jours</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={loadReport} variant="secondary" disabled={loading}>
              {loading ? "⏳ Chargement..." : "🔄 Rafraîchir"}
            </Button>
          </div>
        </div>

        {/* Plan actuel */}
        {report?.plan && (
          <Card title="📌 Plan actuel" className="bg-slate-50 dark:bg-slate-800">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold flex items-center gap-2">
                {planBadge(report.plan)} Mon plan
              </span>
              <Button
                className="bg-indigo-600 text-white hover:bg-indigo-700"
                onClick={() => toast.info("🚀 Redirection vers la page Pricing")}
              >
                Gérer mon plan
              </Button>
            </div>
          </Card>
        )}

        {/* Résumé usage */}
        {report && !loading && (
          <div className="grid gap-6 md:grid-cols-3">
            <Card title="⚡ API Calls">
              <p className="text-2xl font-bold">{report.api}</p>
              {report.quota?.api && (
                <ProgressBar value={report.api} max={report.quota.api} color="bg-indigo-500" />
              )}
            </Card>
            <Card title="📂 Projets">
              <p className="text-2xl font-bold">{report.projects}</p>
              {report.quota?.projects && (
                <ProgressBar value={report.projects} max={report.quota.projects} color="bg-green-500" />
              )}
            </Card>
            <Card title="💾 Stockage">
              <p className="text-2xl font-bold">
                {report.storageMB.toFixed(2)} MB
              </p>
              {report.quota?.storageMB && (
                <ProgressBar value={report.storageMB} max={report.quota.storageMB} color="bg-yellow-500" />
              )}
            </Card>
          </div>
        )}

        {/* Historique graphique */}
        {history.length > 0 && (
          <Card title="📈 Historique de consommation">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={history}>
                <Line type="monotone" dataKey="api" stroke="#4F46E5" name="API Calls" />
                <Line type="monotone" dataKey="storageMB" stroke="#10B981" name="Stockage (MB)" />
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip
                  formatter={(value: any, name: string) =>
                    name === "Stockage (MB)"
                      ? [`${value} MB`, name]
                      : [value, name]
                  }
                />
                <Legend />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Pas de données */}
        {!loading && !report && (
          <Card title="ℹ️ Info">
            <p className="text-gray-400 text-center italic">
              Aucun rapport disponible pour le moment.
            </p>
            <Button className="mt-3" onClick={loadReport}>
              Réessayer
            </Button>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
