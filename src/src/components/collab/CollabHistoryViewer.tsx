import { useEffect, useState, useMemo } from "react";
import { socket } from "@/services/socketClient";
import { Loader2 } from "lucide-react";

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
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

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
        {
          id: "temp-" + Date.now(),
          projectId: data.projectId,
          userId: data.actor,
          changes: data.ops,
          createdAt: new Date().toISOString(),
        },
        ...prev, // push en haut
      ]);
    });
    return () => {
      socket.off("updateElements");
    };
  }, [projectId]);

  // Tri et filtrage
  const filtered = useMemo(() => {
    return history
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .filter(
        (entry) =>
          entry.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
          entry.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
          entry.userId.toLowerCase().includes(search.toLowerCase()) ||
          JSON.stringify(entry.changes).toLowerCase().includes(search.toLowerCase())
      );
  }, [history, search]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-400 p-4">
        <Loader2 className="w-4 h-4 animate-spin" />
        Chargement de l’historique...
      </div>
    );
  }

  return (
    <div
      className="p-4 bg-gray-900 text-white rounded-lg max-h-[500px] overflow-y-auto shadow space-y-3"
      aria-live="polite"
    >
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold">📜 Historique de collaboration</h2>
        <input
          type="text"
          placeholder="Filtrer par utilisateur ou contenu..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-2 py-1 rounded text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-800 border border-gray-600 focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {filtered.length === 0 && (
        <p className="text-gray-500 text-sm">Aucune modification trouvée</p>
      )}

      <ul className="space-y-2">
        {filtered.map((entry) => {
          const isOpen = expanded === entry.id;
          return (
            <li
              key={entry.id}
              className="p-3 rounded bg-gray-800 border border-gray-700 text-sm hover:bg-gray-700/70 transition"
            >
              <div className="flex justify-between items-center">
                <span className="font-semibold">
                  {entry.user?.name || entry.user?.email || entry.userId}
                </span>
                <span className="text-gray-400 text-xs">
                  {new Date(entry.createdAt).toLocaleTimeString()}
                </span>
              </div>

              <button
                onClick={() => setExpanded(isOpen ? null : entry.id)}
                className="text-xs mt-1 text-indigo-400 hover:underline"
              >
                {isOpen ? "Masquer les détails ▲" : "Voir les détails ▼"}
              </button>

              {isOpen && (
                <pre className="bg-black text-green-400 text-xs p-2 mt-2 rounded overflow-x-auto max-h-40 overflow-y-auto">
                  {JSON.stringify(entry.changes, null, 2)}
                </pre>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
