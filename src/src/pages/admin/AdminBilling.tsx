// src/pages/admin/AdminBilling.tsx
import { useEffect, useState } from "react";
import { getUsageReport } from "@/services/billing";
import { getAuditLogs, AuditLog } from "@/services/admin";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";

/* ============================================================================
 * Interfaces
 * ========================================================================== */
interface UsageReport {
  api: number;
  projects: number;
  storageMB: number;
  history?: { date: string; api: number; storage: number }[];
}

/* ============================================================================
 * Page – Admin Billing
 * ========================================================================== */
export default function AdminBilling() {
  const [report, setReport] = useState<UsageReport | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"day" | "week" | "month">("month");

  async function fetchData() {
    try {
      setLoading(true);
      const usage = await getUsageReport({ period });
      const audit = await getAuditLogs({ limit: 10 });
      setReport(usage);
      setLogs(audit);
    } catch (err) {
      console.error("❌ fetchData error", err);
      toast.error("Impossible de charger la facturation & usage");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [period]);

  function exportCSV() {
    if (!report?.history) return toast.error("Aucune donnée à exporter");
    const rows = [
      ["Date", "API Calls", "Storage (MB)"],
      ...report.history.map((h) => [h.date, h.api, h.storage]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "billing_report.csv";
    a.click();
    toast.success("📊 Export CSV généré");
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-bold">💰 Facturation & Usage</h1>
          <div className="flex gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as any)}
              className="border rounded px-2 py-1 text-sm dark:bg-slate-900 dark:border-slate-700"
            >
              <option value="day">Jour</option>
              <option value="week">Semaine</option>
              <option value="month">Mois</option>
            </select>
            <Button variant="outline" onClick={fetchData}>
              🔄 Rafraîchir
            </Button>
            <Button onClick={exportCSV}>📥 Export CSV</Button>
          </div>
        </header>

        {/* Stats globales */}
        {loading ? (
          <p className="text-gray-500">⏳ Chargement...</p>
        ) : report ? (
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-gray-500 text-sm">API Calls</p>
                <h2 className="text-2xl font-bold">{report.api}</h2>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-gray-500 text-sm">Projets</p>
                <h2 className="text-2xl font-bold">{report.projects}</h2>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-gray-500 text-sm">Stockage</p>
                <h2 className="text-2xl font-bold">
                  {report.storageMB.toFixed(2)} MB
                </h2>
              </CardContent>
            </Card>
          </div>
        ) : (
          <p className="text-gray-500">Aucune donnée disponible</p>
        )}

        {/* Graphiques */}
        {report?.history && (
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold mb-4">📈 Consommation API</h2>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={report.history}>
                  <Line type="monotone" dataKey="api" stroke="#6366f1" />
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {report?.history && (
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold mb-4">💾 Utilisation du stockage</h2>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={report.history}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="storage" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Dernières actions */}
        {logs.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold mb-4">📝 Dernières actions</h2>
              <ul className="space-y-2 text-sm">
                {logs.map((l) => (
                  <li key={l.id} className="border-b pb-1">
                    <span className="font-mono text-xs text-gray-500">
                      {new Date(l.createdAt).toLocaleString("fr-FR")}
                    </span>{" "}
                    — <strong>{l.action}</strong>{" "}
                    {l.user?.email && (
                      <span className="text-gray-600">({l.user.email})</span>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
