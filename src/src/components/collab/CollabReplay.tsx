import { useEffect, useState, useRef } from "react";

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
  const [index, setIndex] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Charger l’historique
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

  // Jouer le replay
  const play = () => {
    if (history.length === 0) return;
    setPlaying(true);
    let i = 0;
    timerRef.current = setInterval(() => {
      if (i >= history.length) {
        stop();
        return;
      }
      const entry = history[i];
      setIndex(i);
      onApplyChange?.(entry.changes, entry); // applique le patch si fourni
      i++;
    }, 1000); // 1s entre chaque étape
  };

  const stop = () => {
    setPlaying(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const stepTo = (i: number) => {
    if (i < 0 || i >= history.length) return;
    setIndex(i);
    onApplyChange?.(history[i].changes, history[i]);
  };

  if (loading) return <p className="text-gray-400">Chargement du replay...</p>;

  return (
    <div className="p-4 bg-gray-900 text-white rounded-lg shadow space-y-2">
      <h2 className="text-lg font-bold">⏪ Replay Collaboration</h2>

      <div className="flex items-center space-x-2">
        <button
          className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded"
          onClick={play}
          disabled={playing}
        >
          ▶️ Play
        </button>
        <button
          className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded"
          onClick={stop}
          disabled={!playing}
        >
          ⏹️ Stop
        </button>
      </div>

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

      {history[index] && (
        <div className="mt-2 p-2 bg-gray-800 rounded text-xs">
          <p>
            <strong>{history[index].user?.name || history[index].user?.email || history[index].userId}</strong>{" "}
            <span className="text-gray-400">
              {new Date(history[index].createdAt).toLocaleTimeString()}
            </span>
          </p>
          <pre className="bg-black text-green-400 p-2 rounded overflow-x-auto mt-1">
            {JSON.stringify(history[index].changes, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
