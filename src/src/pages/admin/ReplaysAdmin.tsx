// src/pages/admin/ReplaysAdmin.tsx
import { useEffect, useState } from "react";
import { getAllReplays } from "@/services/admin";
import toast from "react-hot-toast";
import DashboardLayout from "@/layouts/DashboardLayout";

export default function ReplaysAdmin() {
  const [replays, setReplays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  async function fetchReplays() {
    try {
      setLoading(true);
      const res = await getAllReplays();
      setReplays(res || []);
    } catch (err) {
      console.error("❌ Erreur chargement replays:", err);
      toast.error("Impossible de charger les replays");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReplays();
  }, []);

  if (loading) return <p className="p-6 text-gray-500">⏳ Chargement replays...</p>;

  // 🔎 Filtrage recherche + date
  const now = Date.now();
  const filtered = replays.filter((r) => {
    const matchesSearch =
      r.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
      r.project?.name?.toLowerCase().includes(search.toLowerCase());

    let matchesDate = true;
    if (filterDate === "24h") {
      matchesDate = new Date(r.startedAt).getTime() > now - 24 * 60 * 60 * 1000;
    } else if (filterDate === "7d") {
      matchesDate = new Date(r.startedAt).getTime() > now - 7 * 24 * 60 * 60 * 1000;
    } else if (filterDate === "30d") {
      matchesDate = new Date(r.startedAt).getTime() > now - 30 * 24 * 60 * 60 * 1000;
    }

    return matchesSearch && matchesDate;
  });

  // Pagination
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const getDurationLabel = (r: any) => {
    if (!r.endedAt) return <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-600">⏳ En cours</span>;
    const mins = Math.round(
      (new Date(r.endedAt).getTime() - new Date(r.startedAt).getTime()) /
        1000 /
        60
    );
    return (
      <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-600">
        {mins} min
      </span>
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <h1 className="text-2xl font-bold">🎥 Replays Collaboratifs</h1>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              placeholder="Rechercher par utilisateur ou projet..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="border rounded px-3 py-2 w-64 dark:bg-slate-900 dark:border-slate-700"
            />
            <select
              value={filterDate}
              onChange={(e) => {
                setFilterDate(e.target.value);
                setPage(1);
              }}
              className="border rounded px-2 py-2 dark:bg-slate-900 dark:border-slate-700"
            >
              <option value="all">Toutes dates</option>
              <option value="24h">Dernières 24h</option>
              <option value="7d">7 derniers jours</option>
              <option value="30d">30 derniers jours</option>
            </select>
            <button
              onClick={fetchReplays}
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              🔄 Rafraîchir
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-gray-500">Aucun replay disponible.</p>
        ) : (
          <div className="overflow-x-auto shadow rounded-lg">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 dark:bg-slate-800 text-left">
                  <th className="p-3 border">Projet</th>
                  <th className="p-3 border">Utilisateur</th>
                  <th className="p-3 border">Date début</th>
                  <th className="p-3 border">Durée</th>
                  <th className="p-3 border">Replay</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
                  >
                    <td className="p-3">{r.project?.name || "—"}</td>
                    <td className="p-3">{r.user?.email || "—"}</td>
                    <td className="p-3">
                      {new Date(r.startedAt).toLocaleString("fr-FR")}
                    </td>
                    <td className="p-3">{getDurationLabel(r)}</td>
                    <td className="p-3">
                      {r.dataUrl ? (
                        <a
                          href={r.dataUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-500 hover:underline"
                        >
                          ▶️ Voir
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
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
    </DashboardLayout>
  );
}
