import { useEffect, useState } from "react";
import { socket } from "@/services/socketClient";

type HistoryEntry = {
  id: string;
  projectId: string;
  userId: string;
  user?: { id: string; email?: string; name?: string };
  changes: any;
  createdAt: string;
};

export default function CollabHistoryViewer({ projectId }: { projectId: string }) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Charger l’historique initial
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

  // Écouter les nouveaux events "updateElements"
  useEffect(() => {
    socket.on("updateElements", (data: any) => {
      setHistory((prev) => [
        ...prev,
        {
          id: "temp-" + Date.now(),
          projectId: data.projectId,
          userId: data.actor,
          changes: data.ops,
          createdAt: new Date().toISOString(),
        },
      ]);
    });
    return () => {
      socket.off("updateElements");
    };
  }, [projectId]);

  if (loading) return <p className="text-gray-400">Chargement de l’historique...</p>;

  return (
    <div className="p-4 bg-gray-900 text-white rounded-lg max-h-[400px] overflow-y-auto shadow">
      <h2 className="text-lg font-bold mb-2">📜 Historique de collaboration</h2>
      {history.length === 0 && <p className="text-gray-500">Aucune modification encore</p>}
      <ul className="space-y-2">
        {history.map((entry) => (
          <li
            key={entry.id}
            className="p-2 rounded bg-gray-800 border border-gray-700 text-sm"
          >
            <div className="flex justify-between">
              <span className="font-semibold">
                {entry.user?.name || entry.user?.email || entry.userId}
              </span>
              <span className="text-gray-400 text-xs">
                {new Date(entry.createdAt).toLocaleTimeString()}
              </span>
            </div>
            <pre className="bg-black text-green-400 text-xs p-2 mt-1 rounded overflow-x-auto">
              {JSON.stringify(entry.changes, null, 2)}
            </pre>
          </li>
        ))}
      </ul>
    </div>
  );
}
