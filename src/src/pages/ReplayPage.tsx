// src/pages/ReplayPage.tsx
import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import DashboardLayout from "@/layouts/DashboardLayout";
import { getReplays, deleteReplay } from "@/services/replay";
import { Card, CardContent } from "@/components/ui/card";
import {
  Loader2,
  Download,
  Filter,
  Calendar,
  Video,
  Gamepad2,
  Trash2,
  Play,
  Pause,
} from "lucide-react";

interface Replay {
  id: string;
  user?: { email?: string };
  createdAt: string;
  dataUrl?: string;
  type?: "video" | "session";
  events?: { t: number; action: string; payload: any }[];
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [filter, setFilter] = useState<"all" | "video" | "session">("all");
  const [search, setSearch] = useState("");
  const limit = 10;

  async function fetchReplays() {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await getReplays(projectId, page, limit);
      let data: Replay[] = res.data || [];
      // Filtrage local
      if (filter !== "all") data = data.filter((r) => r.type === filter);
      if (search.trim()) {
        data = data.filter(
          (r) =>
            r.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
            r.id.includes(search)
        );
      }
      setReplays(data);
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
  }, [projectId, page, filter, search]);

  async function handleDelete(replayId: string) {
    if (!window.confirm("Supprimer ce replay ?")) return;
    try {
      await deleteReplay(projectId!, replayId);
      toast.success("Replay supprimé ✅");
      fetchReplays();
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  }

  /* ====== Lecture auto session ====== */
  useEffect(() => {
    if (!isPlaying || !selectedReplay?.events) return;
    const interval = setInterval(() => {
      setSliderPos((pos) =>
        pos < (selectedReplay.events?.length || 0) - 1 ? pos + 1 : pos
      );
    }, 500);
    return () => clearInterval(interval);
  }, [isPlaying, selectedReplay]);

  /* ====== Hotkeys ====== */
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!selectedReplay?.events) return;
      if (e.key === "ArrowRight")
        setSliderPos((p) => Math.min(p + 1, selectedReplay.events!.length - 1));
      if (e.key === "ArrowLeft")
        setSliderPos((p) => Math.max(p - 1, 0));
      if (e.key === " ")
        setIsPlaying((p) => !p);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedReplay]);

  const downloadReplay = useCallback((r: Replay) => {
    if (r.type === "video" && r.dataUrl) {
      window.open(r.dataUrl, "_blank");
    } else if (r.type === "session" && r.events) {
      const blob = new Blob([JSON.stringify(r.events, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `replay-${r.id}.json`;
      a.click();
    }
  }, []);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">🎬 Replays du projet</h1>
          <button
            onClick={fetchReplays}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            🔄 Rafraîchir
          </button>
        </div>

        {/* Recherche + Filtres */}
        <div className="flex flex-col md:flex-row gap-3 items-center">
          <input
            type="text"
            placeholder="🔍 Rechercher par ID ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 border rounded w-full md:w-1/3 dark:bg-slate-900 dark:border-slate-700"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1 rounded ${
                filter === "all" ? "bg-indigo-600 text-white" : "bg-slate-200"
              }`}
            >
              <Filter className="w-4 h-4 inline mr-1" /> Tous
            </button>
            <button
              onClick={() => setFilter("video")}
              className={`px-3 py-1 rounded ${
                filter === "video" ? "bg-indigo-600 text-white" : "bg-slate-200"
              }`}
            >
              <Video className="w-4 h-4 inline mr-1" /> Vidéos
            </button>
            <button
              onClick={() => setFilter("session")}
              className={`px-3 py-1 rounded ${
                filter === "session" ? "bg-indigo-600 text-white" : "bg-slate-200"
              }`}
            >
              <Gamepad2 className="w-4 h-4 inline mr-1" /> Sessions
            </button>
          </div>
        </div>

        {loading && (
          <p className="flex items-center gap-2 text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Chargement des replays...
          </p>
        )}
        {error && <p className="text-red-500">{error}</p>}

        {!loading && !error && replays.length === 0 && (
          <p className="text-gray-400">Aucun replay trouvé.</p>
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
                    <p className="font-semibold flex items-center gap-2">
                      {r.type === "video" ? (
                        <Video className="w-4 h-4 text-indigo-500" />
                      ) : (
                        <Gamepad2 className="w-4 h-4 text-green-500" />
                      )}
                      Replay #{r.id}
                    </p>
                    <p className="text-sm text-gray-500">
                      👤 {r.user?.email || "Inconnu"} •{" "}
                      {new Date(r.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => downloadReplay(r)}
                      className="px-3 py-1 text-sm rounded bg-slate-200 hover:bg-slate-300 flex items-center gap-1"
                    >
                      <Download size={14} /> Télécharger
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
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="px-3 py-1 text-sm rounded bg-red-500 text-white hover:bg-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Aperçu intégré */}
                {r.type === "video" && r.dataUrl && (
                  <video
                    controls
                    className="w-full rounded border dark:border-slate-700"
                    src={r.dataUrl}
                  />
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Viewer interactif */}
        {selectedReplay && selectedReplay.type === "session" && (
          <Card className="shadow-md mt-6">
            <CardContent className="p-4 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="font-semibold text-lg">
                  🕹️ Replay interactif #{selectedReplay.id}
                </h2>
                <button
                  onClick={() => setIsPlaying((p) => !p)}
                  className="px-3 py-1 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-1"
                >
                  {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                  {isPlaying ? "Pause" : "Lecture"}
                </button>
              </div>
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
