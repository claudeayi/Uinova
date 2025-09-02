import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import DashboardLayout from "@/layouts/DashboardLayout";
import { getReplays, deleteReplay } from "@/services/replay";
import { Card, CardContent } from "@/components/ui/card";

interface Replay {
  id: string;
  user?: { email?: string };
  createdAt: string;
  dataUrl?: string;
  type?: "video" | "session"; // ajout pour distinguer replay vidéo ou CRDT
  events?: { t: number; action: string; payload: any }[]; // si session
}

export default function ReplayPage() {
  const { projectId } = useParams();
  const [replays, setReplays] = useState<Replay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedReplay, setSelectedReplay] = useState<Replay | null>(null);
  const [sliderPos, setSliderPos] = useState(0);
  const limit = 10;

  async function fetchReplays() {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await getReplays(projectId, page, limit);
      setReplays(res.data || []);
      setTotal(res.pagination?.total || 0);
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
      await deleteReplay(projectId!, replayId);
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
          <p className="text-gray-400">Aucun replay disponible pour ce projet.</p>
        )}

        {/* Liste des replays */}
        <div className="grid gap-4">
          {replays.map((r) => (
            <Card
              key={r.id}
              className={`p-4 shadow ${
                selectedReplay?.id === r.id ? "border-indigo-500" : ""
              }`}
            >
              <CardContent className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">Replay #{r.id}</p>
                    <p className="text-sm text-gray-500">
                      👤 {r.user?.email || "Inconnu"} •{" "}
                      {new Date(r.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="px-3 py-1 text-sm rounded bg-red-500 text-white hover:bg-red-600"
                    >
                      🗑️ Supprimer
                    </button>
                    <button
                      onClick={() =>
                        setSelectedReplay(
                          selectedReplay?.id === r.id ? null : r
                        )
                      }
                      className="px-3 py-1 text-sm rounded bg-indigo-500 text-white hover:bg-indigo-600"
                    >
                      {selectedReplay?.id === r.id ? "Fermer" : "Lire"}
                    </button>
                  </div>
                </div>

                {/* Aperçu intégré */}
                {r.dataUrl?.endsWith(".mp4") ? (
                  <video
                    controls
                    className="w-full rounded border dark:border-slate-700"
                    src={r.dataUrl}
                  />
                ) : (
                  <a
                    href={r.dataUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block text-indigo-500 hover:underline"
                  >
                    ▶️ Voir le replay
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Viewer interactif */}
        {selectedReplay && selectedReplay.type === "session" && (
          <Card className="shadow-md mt-6">
            <CardContent className="p-4 space-y-4">
              <h2 className="font-semibold text-lg">
                🕹️ Lecture interactive – Replay #{selectedReplay.id}
              </h2>
              <input
                type="range"
                min={0}
                max={selectedReplay.events?.length || 0}
                value={sliderPos}
                onChange={(e) => setSliderPos(Number(e.target.value))}
                className="w-full"
              />
              <div className="p-3 rounded bg-slate-100 dark:bg-slate-800">
                {selectedReplay.events && selectedReplay.events[sliderPos] ? (
                  <pre className="text-sm font-mono whitespace-pre-wrap">
                    {JSON.stringify(
                      selectedReplay.events[sliderPos],
                      null,
                      2
                    )}
                  </pre>
                ) : (
                  <p className="text-gray-500">Aucun événement à afficher.</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

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
