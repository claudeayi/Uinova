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
import {
  RefreshCw,
  Download,
  Activity,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

interface Metrics {
  uptime: number;
  memory: { used: number; free: number; total: number; usagePercent: string };
  cpu: { loadAvg: number[]; cores: number };
  db: { usersCount: number; projectsCount: number };
  platform: string;
  arch: string;
}

interface LogEntry {
  id: string;
  createdAt: string;
  action: string;
  metadata?: Record<string, any>;
}

function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return `${h}h ${m}m ${s}s`;
}

export default function MonitoringPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [cpuHistory, setCpuHistory] = useState<any[]>([]);
  const [memHistory, setMemHistory] = useState<any[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [search, setSearch] = useState("");

  const fetchMetrics = async () => {
    try {
      const res = await axios.get("/api/monitoring/metrics", {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      });
      const data = res.data.data || res.data;
      setMetrics(data);

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

      // Alertes
      const cpuPct = (data.cpu.loadAvg[0] / data.cpu.cores) * 100;
      const memPct = parseFloat(data.memory.usagePercent.replace("%", ""));
      if (cpuPct > 80) toast.error("⚠️ CPU en surcharge !");
      if (memPct > 80) toast.error("⚠️ Mémoire saturée !");
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
      /* pas admin */
    }
  };

  const exportData = (type: "json" | "csv") => {
    const blob =
      type === "json"
        ? new Blob([JSON.stringify({ metrics, logs }, null, 2)], {
            type: "application/json",
          })
        : new Blob(
            [
              "id,createdAt,action,metadata\n",
              logs
                .map(
                  (l) =>
                    `${l.id},"${l.createdAt}",${l.action},"${JSON.stringify(
                      l.metadata
                    )}"`
                )
                .join("\n"),
            ],
            { type: "text/csv" }
          );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `monitoring-${Date.now()}.${type}`;
    a.click();
  };

  useEffect(() => {
    fetchMetrics();
    fetchLogs();
    const interval = setInterval(() => {
      if (autoRefresh) fetchMetrics();
    }, 30_000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Hotkeys
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "r") fetchMetrics();
      if (e.key === "f") setAutoRefresh((a) => !a);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  if (loading)
    return <p className="text-center">⏳ Chargement des métriques...</p>;

  const cpuPercent = metrics
    ? Math.min(100, (metrics.cpu.loadAvg[0] / metrics.cpu.cores) * 100)
    : 0;
  const cpuColor =
    cpuPercent < 50
      ? "bg-green-500"
      : cpuPercent < 80
      ? "bg-yellow-500"
      : "bg-red-500";

  const memPercent = metrics
    ? parseFloat(metrics.memory.usagePercent.replace("%", ""))
    : 0;

  const systemStatus =
    cpuPercent > 80 || memPercent > 80
      ? "critical"
      : cpuPercent > 60 || memPercent > 60
      ? "warning"
      : "healthy";

  return (
    <DashboardLayout>
      <div className="space-y-8 p-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-500" /> Monitoring
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setLoading(true);
                fetchMetrics();
                fetchLogs();
              }}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
            >
              <RefreshCw className="w-4 h-4" /> Rafraîchir
            </button>
            <button
              onClick={() => exportData("json")}
              className="px-3 py-1 bg-slate-200 rounded hover:bg-slate-300"
            >
              <Download className="w-4 h-4 inline" /> JSON
            </button>
            <button
              onClick={() => exportData("csv")}
              className="px-3 py-1 bg-slate-200 rounded hover:bg-slate-300"
            >
              <Download className="w-4 h-4 inline" /> CSV
            </button>
          </div>
        </div>

        {/* System status */}
        <div
          className={`p-4 rounded flex items-center gap-2 ${
            systemStatus === "healthy"
              ? "bg-green-100 text-green-700"
              : systemStatus === "warning"
              ? "bg-yellow-100 text-yellow-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {systemStatus === "healthy" && <CheckCircle className="w-5 h-5" />}
          {systemStatus === "warning" && <AlertTriangle className="w-5 h-5" />}
          {systemStatus === "critical" && <AlertTriangle className="w-5 h-5" />}
          Système {systemStatus.toUpperCase()}
        </div>

        {/* Metrics */}
        {metrics && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <MetricCard label="⏱️ Uptime" value={formatDuration(metrics.uptime)} />
            <MetricCard
              label="💾 Mémoire"
              value={`${metrics.memory.usagePercent}`}
              bar
              percent={memPercent}
              color="bg-green-500"
            />
            <MetricCard
              label="🖥️ CPU"
              value={`${cpuPercent.toFixed(1)}%`}
              bar
              percent={cpuPercent}
              color={cpuColor}
            />
            <MetricCard
              label="🗄️ Base de données"
              value={`${metrics.db.usersCount} users • ${metrics.db.projectsCount} projets`}
            />
            <MetricCard
              label="⚙️ Environnement"
              value={`${metrics.platform} • ${metrics.arch}`}
            />
          </div>
        )}

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6">
          <ChartBox title="📈 Charge CPU" data={cpuHistory} stroke="#6366f1" />
          <ChartBox
            title="📈 Utilisation Mémoire"
            data={memHistory}
            stroke="#22c55e"
          />
        </div>

        {/* Logs */}
        {logs.length > 0 && (
          <div className="bg-black text-green-400 rounded shadow font-mono text-xs p-4">
            <h2 className="font-semibold mb-3 text-white">📝 Derniers logs</h2>
            <input
              type="text"
              placeholder="🔍 Rechercher un log..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-3 px-2 py-1 rounded bg-slate-900 text-white w-full"
            />
            <ul className="max-h-64 overflow-y-auto space-y-3">
              {logs
                .filter(
                  (l) =>
                    l.action.toLowerCase().includes(search.toLowerCase()) ||
                    JSON.stringify(l.metadata)
                      .toLowerCase()
                      .includes(search.toLowerCase())
                )
                .map((l) => (
                  <li
                    key={l.id}
                    className="border-l-2 border-green-400 pl-2 space-y-1"
                  >
                    <span className="text-gray-400">
                      [{new Date(l.createdAt).toLocaleTimeString()}]
                    </span>{" "}
                    <span className="text-cyan-400">{l.action}</span>
                    <pre className="text-green-400 whitespace-pre-wrap">
                      {JSON.stringify(l.metadata, null, 2)}
                    </pre>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

/* ============================================================================
 * Components utils
 * ========================================================================== */
function MetricCard({
  label,
  value,
  bar,
  percent,
  color,
}: {
  label: string;
  value: string;
  bar?: boolean;
  percent?: number;
  color?: string;
}) {
  return (
    <div className="p-4 bg-white dark:bg-slate-800 rounded shadow space-y-2">
      <h2 className="font-semibold">{label}</h2>
      <p>{value}</p>
      {bar && percent !== undefined && (
        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded h-2">
          <div
            className={`${color} h-2 rounded`}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </div>
  );
}

function ChartBox({
  title,
  data,
  stroke,
}: {
  title: string;
  data: any[];
  stroke: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 p-4 rounded shadow">
      <h2 className="font-semibold mb-3">{title}</h2>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <Line type="monotone" dataKey="value" stroke={stroke} />
          <CartesianGrid stroke="#ccc" />
          <XAxis dataKey="time" hide />
          <YAxis />
          <Tooltip />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
