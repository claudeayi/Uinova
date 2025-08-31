import { useEffect, useState } from "react";
import axios from "axios";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get("/api/monitoring/metrics").then((res) => {
      setMetrics(res.data.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <p className="text-center">⏳ Chargement des métriques...</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">📊 Monitoring</h1>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-white dark:bg-slate-800 rounded shadow">
          <h2 className="font-semibold">Uptime</h2>
          <p>{metrics?.uptime.toFixed(0)} sec</p>
        </div>
        <div className="p-4 bg-white dark:bg-slate-800 rounded shadow">
          <h2 className="font-semibold">Mémoire</h2>
          <p>{metrics?.memory.usagePercent}</p>
        </div>
        <div className="p-4 bg-white dark:bg-slate-800 rounded shadow">
          <h2 className="font-semibold">CPU</h2>
          <p>{metrics?.cpu.loadAvg.join(", ")} (cores: {metrics?.cpu.cores})</p>
        </div>
        <div className="p-4 bg-white dark:bg-slate-800 rounded shadow">
          <h2 className="font-semibold">Base de données</h2>
          <p>👥 {metrics?.db.usersCount} users | 📁 {metrics?.db.projectsCount} projects</p>
        </div>
      </div>
    </div>
  );
}
