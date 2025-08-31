import { useEffect, useState } from "react";
import http from "@/services/http";

export default function LogsAdmin() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await http.get("/monitoring/logs");
        setLogs(res.data);
      } catch (err) {
        console.error("❌ Erreur chargement logs:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  if (loading) return <p className="text-gray-500">Chargement...</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">📜 Logs système</h1>
      <ul className="space-y-2">
        {logs.map((log) => (
          <li
            key={log.id}
            className="p-3 rounded bg-slate-100 dark:bg-slate-800 shadow"
          >
            <div className="text-sm text-gray-600 dark:text-gray-300">
              <strong>{log.action}</strong> — {log.user?.email || "System"}
            </div>
            <pre className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {JSON.stringify(log.metadata, null, 2)}
            </pre>
          </li>
        ))}
      </ul>
    </div>
  );
}
