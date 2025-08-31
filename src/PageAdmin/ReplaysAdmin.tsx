import { useEffect, useState } from "react";
import { getAllReplays, deleteReplay } from "@/services/admin";
import toast from "react-hot-toast";

export default function ReplaysAdmin() {
  const [replays, setReplays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  async function fetchReplays() {
    try {
      const res = await getAllReplays();
      setReplays(res || []);
    } catch (err) {
      console.error("❌ Erreur chargement replays:", err);
      toast.error("Impossible de charger les replays");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(replayId: string) {
    if (!window.confirm("Supprimer ce replay définitivement ?")) return;
    try {
      await deleteReplay(replayId);
      toast.success("Replay supprimé ✅");
      setReplays((prev) => prev.filter((r) => r.id !== replayId));
    } catch (err) {
      console.error("❌ Erreur suppression replay:", err);
      toast.error("Erreur suppression replay");
    }
  }

  useEffect(() => {
    fetchReplays();
  }, []);

  if (loading) return <p className="p-4 text-gray-500">Chargement...</p>;

  // 🔎 Filtre + pagination
  const filtered = replays.filter(
    (r) =>
      r.project?.name?.toLowerCase().includes(search.toLowerCase()) ||
      (r.project?.owner?.email || "").toLowerCase().includes(search.toLowerCase())
  );
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">🎥 Replays Collaboratifs</h1>

      {/* 🔎 Recherche */}
      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          placeholder="Rechercher par projet ou propriétaire..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="border rounded px-3 py-2 w-full md:w-1/3"
        />
        <p className="text-sm text-gray-500 ml-4">{filtered.length} replay(s)</p>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto rounded shadow">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 dark:bg-slate-800">
              <th className="p-3 border">Projet</th>
              <th className="p-3 border">Fichier</th>
              <th className="p-3 border">Date</th>
              <th className="p-3 border">Action</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((r) => (
              <tr
                key={r.id}
                className="text-center border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <td className="p-3 font-medium">{r.project?.name || "—"}</td>
                <td className="p-3">
                  {r.dataUrl ? (
                    <a
                      href={r.dataUrl}
                      className="text-blue-600 hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Télécharger
                    </a>
                  ) : (
                    <span className="text-gray-400 italic">Aucun fichier</span>
                  )}
                </td>
                <td className="p-3">
                  {new Date(r.createdAt).toLocaleString("fr-FR")}
                </td>
                <td className="p-3">
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-4 space-x-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 rounded border disabled:opacity-50"
          >
            ← Précédent
          </button>
          <span className="px-3 py-1">
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
