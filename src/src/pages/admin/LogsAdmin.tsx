import { useEffect, useState } from "react";
import { getAuditLogs, AuditLog } from "@/services/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import DashboardLayout from "@/layouts/DashboardLayout";

export default function LogsAdmin() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(50);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  async function fetchLogs() {
    try {
      setLoading(true);
      const data = await getAuditLogs({ limit, search });
      setLogs(data || []);
    } catch (err) {
      console.error("❌ Erreur chargement logs:", err);
      toast.error("Impossible de charger les logs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs();
  }, [limit, search]);

  // Pagination côté client
  const paginated = logs.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(logs.length / pageSize);

  if (loading) {
    return (
      <DashboardLayout>
        <p className="p-6 text-gray-500">⏳ Chargement des logs...</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-bold">📝 Logs & Audit</h1>
          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="text"
              placeholder="Rechercher par action ou utilisateur..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="border rounded px-3 py-2 w-full md:w-72 dark:bg-slate-900 dark:border-slate-700"
            />
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="border rounded px-2 py-2 text-sm dark:bg-slate-900 dark:border-slate-700"
            >
              <option value={20}>20 derniers</option>
              <option value={50}>50 derniers</option>
              <option value={100}>100 derniers</option>
              <option value={200}>200 derniers</option>
            </select>
            <Button onClick={fetchLogs}>🔄 Rafraîchir</Button>
          </div>
        </header>

        <p className="text-sm text-gray-500">
          {logs.length} log(s) trouvé(s)
        </p>

        {/* Tableau */}
        <Card className="shadow-md rounded-2xl">
          <CardContent className="overflow-x-auto p-0">
            {paginated.length === 0 ? (
              <p className="text-center text-gray-500 py-10">
                Aucun log disponible.
              </p>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100 dark:bg-slate-800 text-left">
                    <th className="p-3 border">Date</th>
                    <th className="p-3 border">Utilisateur</th>
                    <th className="p-3 border">Action</th>
                    <th className="p-3 border">Détails</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
                    >
                      <td className="p-3 text-gray-500">
                        {new Date(log.createdAt).toLocaleString("fr-FR")}
                      </td>
                      <td className="p-3">{log.user?.email || "—"}</td>
                      <td className="p-3 font-medium">{log.action}</td>
                      <td className="p-3">
                        <pre className="text-xs bg-gray-100 dark:bg-slate-900 p-2 rounded max-w-xs overflow-x-auto">
                          {log.metadata
                            ? JSON.stringify(log.metadata, null, 2)
                            : "—"}
                        </pre>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-4 space-x-2">
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              ← Précédent
            </Button>
            <span className="px-3 py-1">
              Page {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Suivant →
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
