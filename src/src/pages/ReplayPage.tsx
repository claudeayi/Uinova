// src/pages/ReplayPage.tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";

export default function ReplayPage() {
  const { projectId } = useParams();
  const [replays, setReplays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  async function fetchReplays() {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await axios.get(`/api/replay/${projectId}?page=${page}&limit=${limit}`, {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      });
      setReplays(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
      setError(null);
    } catch (err: any) {
      console.error("❌ Erreur chargement replays:", err);
      setError("Impossible de charger les replays");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReplays();
  }, [projectId, page]);

  async function handleDelete(replayId: string) {
    if (!window.confirm("Supprimer ce replay ?")) return;
    try {
      await axios.delete(`/api/replay/${projectId}/${replayId}`, {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      });
      toast.success("Replay supprimé");
      fetchReplays();
    } catch (err) {
      toast.error("Erreur lors de la suppression");
    }
  }

  if (loading) {
    return <p className="p-6 text-gray-500">⏳ Chargement des replays...</p>;
  }

  if (error) {
    return <p className="p-6 text-red-500">{error}</p>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">🎬 Replays du projet</h1>

      {replays.length === 0 ? (
        <p className="text-gray-400">Aucun replay disponible pour ce projet.</p>
      ) : (
        <ul className="space-y-3">
          {replays.map((r) => (
            <li
              key={r.id}
              className="p-4 rounded-lg shadow bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">Replay #{r.id}</p>
                  <p className="text-sm text-gray-500">
                    Auteur: {r.user?.email || "Inconnu"} •{" "}
                    {new Date(r.createdAt).toLocaleString()}
                  </p>
                  <a
                    href={r.dataUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block mt-2 text-indigo-500 hover:underline"
                  >
                    ▶️ Voir le replay
                  </a>
                </div>
                <button
                  onClick={() => handleDelete(r.id)}
                  className="px-3 py-1 text-sm rounded bg-red-500 text-white hover:bg-red-600"
                >
                  🗑️ Supprimer
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Pagination */}
      {total > limit && (
        <div className="flex justify-center gap-2 pt-4">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 rounded bg-slate-200 disabled:opacity-50"
          >
            ◀️ Précédent
          </button>
          <span className="px-2 py-1">
            Page {page} / {Math.ceil(total / limit)}
          </span>
          <button
            disabled={page >= Math.ceil(total / limit)}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 rounded bg-slate-200 disabled:opacity-50"
          >
            Suivant ▶️
          </button>
        </div>
      )}
    </div>
  );
}
