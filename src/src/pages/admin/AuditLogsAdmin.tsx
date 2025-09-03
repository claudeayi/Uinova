import { useEffect, useState } from "react";
import { getAuditLogs, AuditLog } from "@/services/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import DashboardLayout from "@/layouts/DashboardLayout";

export default function AuditLogsAdmin() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  async function fetchLogs() {
    try {
      setLoading(true);
      const data = await getAuditLogs({ limit: 500 }); // backend peut limiter
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
  }, []);

  // 🔎 Filtrage & pagination
  const filtered = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      (l.user?.email || "").toLowerCase().includes(search.toLowerCase())
  );
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-bold">📜 Logs système</h1>
          <div className="flex gap-2">
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
            <Button variant="outline" onClick={fetchLogs}>
              🔄 Rafraîchir
            </Button>
          </div>
        </header>

        {loading ? (
          <p className="p-6 text-gray-500">⏳ Chargement des logs...</p>
        ) : (
          <p className="text-sm text-gray-500">
            {filtered.length} log(s) trouvé(s)
          </p>
        )}

        {/* Tableau */}
        <Card className="shadow-md rounded-2xl">
          <CardContent className="overflow-x-auto p-0">
            {loading ? (
              <div className="text-center py-10 text-gray-500">Chargement...</div>
            ) : paginated.length === 0 ? (
              <p className="text-center text-gray-500 py-10">
                Aucun log trouvé.
              </p>
            ) : (
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
                  {paginated.map((l) => (
                    <tr
                      key={l.id}
                      className="border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition"
                    >
                      <td className="p-3">{l.user?.email || "—"}</td>
                      <td className="p-3 font-medium">{l.action}</td>
                      <td className="p-3 text-xs text-gray-600 max-w-xs truncate">
                        {l.metadata ? JSON.stringify(l.metadata) : "—"}
                      </td>
                      <td className="p-3">
                        {new Date(l.createdAt).toLocaleString("fr-FR")}
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
