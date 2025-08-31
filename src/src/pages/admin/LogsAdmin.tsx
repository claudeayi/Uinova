// src/pages/admin/LogsAdmin.tsx
import { useEffect, useState } from "react";
import { getAuditLogs } from "@/services/admin";
import toast from "react-hot-toast";

export default function LogsAdmin() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  async function fetchLogs() {
    try {
      setLoading(true);
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
    return <p className="p-6 text-gray-500">⏳ Chargement des journaux...</p>;
  }

  // 🔎 Filtrage recherche + date
  const now = Date.now();
  const filtered = logs.filter((log) => {
    const matchesSearch =
      log.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
      log.action?.toLowerCase().includes(search.toLowerCase());

    let matchesDate = true;
    if (filterDate === "24h") {
      matchesDate = new Date(log.createdAt).getTime() > now - 24 * 60 * 60 * 1000;
    } else if (filterDate === "7d") {
      matchesDate = new Date(log.createdAt).getTime() > now - 7 * 24 * 60 * 60 * 1000;
    } else if (filterDate === "30d") {
      matchesDate = new Date(log.createdAt).getTime() > now - 30 * 24 * 60 * 60 * 1000;
    }

    return matchesSearch && matchesDate;
  });

  // Pagination
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h1 className="text-2xl font-bold">📜 Journaux système</h1>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Rechercher (utilisateur ou action)..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="border rounded px-3 py-2 w-64"
          />
          <select
            value={filterDate}
            onChange={(e) => {
              setFilterDate(e.target.value);
              setPage(1);
            }}
            className="border rounded px-2 py-2"
          >
            <option value="all">Toutes dates</option>
            <option value="24h">Dernières 24h</option>
            <option value="7d">7 derniers jours</option>
            <option value="30d">30 derniers jours</option>
          </select>
          <button
            onClick={fetchLogs}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            🔄 Rafraîchir
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-500">Aucun log trouvé.</p>
      ) : (
        <div className="overflow-x-auto shadow rounded-lg">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100 dark:bg-slate-800 text-left">
                <th className="p-3 border">Utilisateur</th>
                <th className="p-3 border">Action</th>
                <th className="p-3 border">Métadonnées</th>
                <th className="p-3 border">Date</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((log) => (
                <tr
                  key={log.id}
                  className="border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
                >
                  <td className="p-3 font-medium">
                    {log.user?.email || (
                      <span className="italic text-gray-400">— système —</span>
                    )}
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-1 rounded text-xs bg-indigo-100 text-indigo-600">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3 text-xs max-w-xs break-words">
                    {log.metadata ? (
                      <pre className="bg-slate-100 dark:bg-slate-900 p-2 rounded overflow-x-auto">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    ) : (
                      <span className="text-gray-400">—</span>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 rounded border disabled:opacity-50"
          >
            ← Précédent
          </button>
          <span>
            Page {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 rounded border disabled:opacity-50"
          >
            Suivant →
          </button>
        </div>
      )}
    </div>
  );
}
