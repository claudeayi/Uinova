// src/pages/MonitoringPage.tsx
import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import DashboardLayout from "@/layouts/DashboardLayout";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Metrics {
  uptime: number;
  memory: { used: number; free: number; total: number; usagePercent: string };
  cpu: { loadAvg: number[]; cores: number };
  db: { usersCount: number; projectsCount: number };
  platform: string;
  arch: string;
}

export default function MonitoringPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cpuHistory, setCpuHistory] = useState<any[]>([]);
  const [memHistory, setMemHistory] = useState<any[]>([]);

  const fetchMetrics = async () => {
    try {
      const res = await axios.get("/api/monitoring/metrics", {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      });
      const data = res.data.data || res.data;
      setMetrics(data);

      // Historique CPU / mémoire
      setCpuHistory((prev) => [
        ...prev.slice(-19),
        { time: new Date().toLocaleTimeString(), value: data.cpu.loadAvg[0] },
      ]);
      setMemHistory((prev) => [
        ...prev.slice(-19),
        {
          time: new Date().toLocaleTimeString(),
          value: parseFloat(data.memory.usagePercent.replace("%", "")),
        },
      ]);
    } catch (err) {
      toast.error("Impossible de charger les métriques");
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await axios.get("/api/monitoring/logs", {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      });
      setLogs(res.data.data || []);
    } catch {
      /* ignore si pas admin */
    }
  };

  useEffect(() => {
    fetchMetrics();
    fetchLogs();
    const interval = setInterval(fetchMetrics, 30_000); // refresh auto
    return () => clearInterval(interval);
  }, []);

  if (loading)
    return <p className="text-center">⏳ Chargement des métriques...</p>;

  return (
    <DashboardLayout>
      <div className="space-y-8 p-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">📊 Monitoring</h1>
          <button
            onClick={() => {
              setLoading(true);
              fetchMetrics();
              fetchLogs();
            }}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            🔄 Rafraîchir
          </button>
        </div>

        {metrics && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Uptime */}
            <div className="p-4 bg-white dark:bg-slate-800 rounded shadow">
              <h2 className="font-semibold mb-1">⏱️ Uptime</h2>
              <p>{Math.floor(metrics.uptime / 60)} min</p>
            </div>

            {/* Mémoire */}
            <div className="p-4 bg-white dark:bg-slate-800 rounded shadow">
              <h2 className="font-semibold mb-1">💾 Mémoire</h2>
              <p>{metrics.memory.usagePercent}</p>
              <div className="w-full bg-gray-200 dark:bg-slate-700 rounded h-2 mt-1">
                <div
                  className="bg-green-500 h-2 rounded"
                  style={{
                    width: metrics.memory.usagePercent,
                  }}
                />
              </div>
            </div>

            {/* CPU */}
            <div className="p-4 bg-white dark:bg-slate-800 rounded shadow">
              <h2 className="font-semibold mb-1">🖥️ CPU</h2>
              <p>
                {metrics.cpu.loadAvg.join(", ")} (cores: {metrics.cpu.cores})
              </p>
              <div className="w-full bg-gray-200 dark:bg-slate-700 rounded h-2 mt-1">
                <div
                  className="bg-purple-500 h-2 rounded"
                  style={{
                    width:
                      Math.min(
                        100,
                        (metrics.cpu.loadAvg[0] / metrics.cpu.cores) * 100
                      ).toFixed(0) + "%",
                  }}
                />
              </div>
            </div>

            {/* DB */}
            <div className="p-4 bg-white dark:bg-slate-800 rounded shadow md:col-span-2">
              <h2 className="font-semibold mb-1">🗄️ Base de données</h2>
              <p>
                👥 {metrics.db.usersCount} utilisateurs | 📁{" "}
                {metrics.db.projectsCount} projets
              </p>
            </div>

            {/* Platform */}
            <div className="p-4 bg-white dark:bg-slate-800 rounded shadow">
              <h2 className="font-semibold mb-1">⚙️ Environnement</h2>
              <p>
                {metrics.platform} • {metrics.arch}
              </p>
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-800 p-4 rounded shadow">
            <h2 className="font-semibold mb-3">📈 Charge CPU</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={cpuHistory}>
                <Line type="monotone" dataKey="value" stroke="#6366f1" />
                <CartesianGrid stroke="#ccc" />
                <XAxis dataKey="time" hide />
                <YAxis />
                <Tooltip />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded shadow">
            <h2 className="font-semibold mb-3">📈 Utilisation Mémoire</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={memHistory}>
                <Line type="monotone" dataKey="value" stroke="#22c55e" />
                <CartesianGrid stroke="#ccc" />
                <XAxis dataKey="time" hide />
                <YAxis />
                <Tooltip />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Logs */}
        {logs.length > 0 && (
          <div className="p-4 bg-black text-green-400 rounded shadow font-mono text-xs">
            <h2 className="font-semibold mb-3 text-white">📝 Derniers logs</h2>
            <ul className="max-h-64 overflow-y-auto space-y-1">
              {logs.map((l) => (
                <li key={l.id}>
                  [{new Date(l.createdAt).toLocaleTimeString()}] {l.action} →{" "}
                  {JSON.stringify(l.metadata)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
