import { useEffect, useState, useRef } from "react";
import { Loader2, Play, Pause, Square, StepBack, StepForward, Download } from "lucide-react";

type HistoryEntry = {
  id: string;
  projectId: string;
  userId: string;
  user?: { id: string; email?: string; name?: string };
  changes: any;
  createdAt: string;
};

interface CollabReplayProps {
  projectId: string;
  onApplyChange?: (change: any, entry: HistoryEntry) => void; // callback pour appliquer le patch
}

export default function CollabReplay({ projectId, onApplyChange }: CollabReplayProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [index, setIndex] = useState(0);
  const [speed, setSpeed] = useState(1); // vitesse (×1 par défaut)
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  /* ===============================
     Charger l’historique
  =============================== */
  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch(`/api/collab/history/${projectId}`);
        const data = await res.json();
        setHistory(data);
      } catch (err) {
        console.error("❌ Erreur chargement history:", err);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, [projectId]);

  /* ===============================
     Replay Logic
  =============================== */
  const play = () => {
    if (history.length === 0) return;
    stop(); // clear avant
    setPlaying(true);
    setPaused(false);
    let i = index;
    timerRef.current = setInterval(() => {
      if (i >= history.length) {
        stop();
        return;
      }
      const entry = history[i];
      setIndex(i);
      onApplyChange?.(entry.changes, entry);
      i++;
    }, 1000 / speed);
  };

  const pause = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPaused(true);
    setPlaying(false);
  };

  const stop = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPlaying(false);
    setPaused(false);
    setIndex(0);
  };

  const stepTo = (i: number) => {
    if (i < 0 || i >= history.length) return;
    setIndex(i);
    onApplyChange?.(history[i].changes, history[i]);
  };

  const stepNext = () => stepTo(index + 1);
  const stepPrev = () => stepTo(index - 1);

  /* ===============================
     Cleanup interval
  =============================== */
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  /* ===============================
     Export JSON
  =============================== */
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(history, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `replay-${projectId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ===============================
     Render
  =============================== */
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-400 p-4">
        <Loader2 className="w-4 h-4 animate-spin" />
        Chargement du replay...
      </div>
    );
  }

  return (
    <div
      className="p-4 bg-gray-900 text-white rounded-lg shadow space-y-3"
      aria-live="polite"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">⏪ Replay Collaboration</h2>
        <button
          onClick={exportJSON}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600"
        >
          <Download className="w-3 h-3" /> Export JSON
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={play}
          disabled={playing}
          className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded disabled:opacity-50"
        >
          <Play className="w-4 h-4 inline" /> Play
        </button>
        <button
          onClick={pause}
          disabled={!playing}
          className="px-2 py-1 bg-yellow-500 hover:bg-yellow-600 rounded disabled:opacity-50"
        >
          <Pause className="w-4 h-4 inline" /> Pause
        </button>
        <button
          onClick={stop}
          className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded"
        >
          <Square className="w-4 h-4 inline" /> Stop
        </button>
        <button
          onClick={stepPrev}
          className="px-2 py-1 bg-slate-600 hover:bg-slate-700 rounded"
        >
          <StepBack className="w-4 h-4 inline" />
        </button>
        <button
          onClick={stepNext}
          className="px-2 py-1 bg-slate-600 hover:bg-slate-700 rounded"
        >
          <StepForward className="w-4 h-4 inline" />
        </button>
      </div>

      {/* Speed */}
      <div className="flex items-center gap-2 text-xs text-gray-300">
        <label>Vitesse:</label>
        <input
          type="range"
          min={0.5}
          max={3}
          step={0.5}
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          className="flex-1"
        />
        <span>×{speed}</span>
      </div>

      {/* Progress */}
      <div className="text-sm text-gray-400">
        Étape {index + 1} / {history.length}
      </div>
      <input
        type="range"
        min={0}
        max={history.length - 1}
        value={index}
        onChange={(e) => stepTo(Number(e.target.value))}
        className="w-full"
      />

      {/* Current entry */}
      {history[index] && (
        <div className="mt-2 p-2 bg-gray-800 rounded text-xs">
          <p>
            <strong>
              {history[index].user?.name ||
                history[index].user?.email ||
                history[index].userId}
            </strong>{" "}
            <span className="text-gray-400">
              {new Date(history[index].createdAt).toLocaleTimeString()}
            </span>
          </p>
          <pre className="bg-black text-green-400 p-2 rounded overflow-x-auto mt-1 max-h-40 overflow-y-auto">
            {JSON.stringify(history[index].changes, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
