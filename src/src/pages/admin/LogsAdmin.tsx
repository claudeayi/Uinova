import { useEffect, useState } from "react";
import { getAuditLogs } from "@/services/admin";
import toast from "react-hot-toast";

export default function LogsAdmin() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchLogs() {
    try {
      const res = await getAuditLogs();
      setLogs(res || []);
    } catch (err) {
      console.error("❌ Erreur chargement logs:", err);
      toast.error("Impossible de charger les logs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs();
  }, []);

  if (loading) {
    return <p className="p-4 text-gray-500">Chargement...</p>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">📜 Journaux système</h1>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 dark:bg-slate-800">
              <th className="p-3 border">Utilisateur</th>
              <th className="p-3 border">Action</th>
              <th className="p-3 border">Métadonnées</th>
              <th className="p-3 border">Date</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="text-center border-b dark:border-slate-700">
                <td className="p-3">{log.user?.email || "—"}</td>
                <td className="p-3">{log.action}</td>
                <td className="p-3 text-sm text-gray-600 dark:text-gray-400">
                  {log.metadata ? JSON.stringify(log.metadata) : "—"}
                </td>
                <td className="p-3">
                  {new Date(log.createdAt).toLocaleString("fr-FR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
