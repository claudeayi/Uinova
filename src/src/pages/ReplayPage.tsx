// src/pages/ReplayPage.tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";
import DashboardLayout from "@/layouts/DashboardLayout";

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
      const res = await axios.get(
        `/api/replay/${projectId}?page=${page}&limit=${limit}`,
        { headers: { Authorization: "Bearer " + localStorage.getItem("token") } }
      );
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
      toast.success("Replay supprimé ✅");
      fetchReplays();
    } catch (err) {
      toast.error("Erreur lors de la suppression");
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">🎬 Replays du projet</h1>
          <button
            onClick={fetchReplays}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            🔄 Rafraîchir
          </button>
        </div>

        {loading && <p className="text-gray-500">⏳ Chargement des replays...</p>}
        {error && <p className="text-red-500">{error}</p>}

        {!loading && !error && replays.length === 0 && (
          <p className="text-gray-400">
            Aucun replay disponible pour ce projet.
          </p>
        )}

        {/* Liste des replays */}
        <div className="grid gap-4">
          {replays.map((r) => (
            <div
              key={r.id}
              className="p-4 rounded-lg shadow bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">Replay #{r.id}</p>
                  <p className="text-sm text-gray-500">
                    👤 {r.user?.email || "Inconnu"} •{" "}
                    {new Date(r.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(r.id)}
                  className="px-3 py-1 text-sm rounded bg-red-500 text-white hover:bg-red-600"
                >
                  🗑️ Supprimer
                </button>
              </div>

              {/* Lecteur intégré si vidéo */}
              {r.dataUrl?.endsWith(".mp4") ? (
                <video
                  controls
                  className="mt-3 w-full rounded border dark:border-slate-700"
                  src={r.dataUrl}
                />
              ) : (
                <a
                  href={r.dataUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block mt-3 text-indigo-500 hover:underline"
                >
                  ▶️ Voir le replay
                </a>
              )}
            </div>
          ))}
        </div>

        {/* Pagination */}
        {total > limit && (
          <div className="flex justify-center gap-3 pt-4">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 rounded bg-slate-200 dark:bg-slate-700 disabled:opacity-50"
            >
              ◀️ Précédent
            </button>
            <span className="px-2 py-1 text-sm">
              Page {page} / {Math.ceil(total / limit)}
            </span>
            <button
              disabled={page >= Math.ceil(total / limit)}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 rounded bg-slate-200 dark:bg-slate-700 disabled:opacity-50"
            >
              Suivant ▶️
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
