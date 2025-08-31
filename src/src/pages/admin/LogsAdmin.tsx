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
    return <p className="p-4 text-gray-500">⏳ Chargement des journaux...</p>;
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">📜 Journaux système</h1>
        <button
          onClick={fetchLogs}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition"
        >
          🔄 Rafraîchir
        </button>
      </div>

      {logs.length === 0 ? (
        <p className="text-gray-500">Aucun log disponible.</p>
      ) : (
        <div className="overflow-x-auto shadow rounded-lg">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-slate-800 text-left">
                <th className="p-3 border">Utilisateur</th>
                <th className="p-3 border">Action</th>
                <th className="p-3 border">Métadonnées</th>
                <th className="p-3 border">Date</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
                >
                  <td className="p-3 font-medium">
                    {log.user?.email || <span className="italic text-gray-400">— système —</span>}
                  </td>
                  <td className="p-3">{log.action}</td>
                  <td className="p-3 text-sm text-gray-600 dark:text-gray-400 max-w-xs break-words">
                    {log.metadata ? (
                      <pre className="bg-slate-100 dark:bg-slate-900 p-2 rounded overflow-x-auto text-xs">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-3 text-sm">
                    {new Date(log.createdAt).toLocaleString("fr-FR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
