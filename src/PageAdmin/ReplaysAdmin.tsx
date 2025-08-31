import { useEffect, useState } from "react";
import http from "@/services/http";

export default function ReplaysAdmin() {
  const [replays, setReplays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReplays() {
      try {
        const res = await http.get("/admin/replays");
        setReplays(res.data);
      } catch (err) {
        console.error("❌ Erreur chargement replays:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchReplays();
  }, []);

  if (loading) return <p className="text-gray-500">Chargement...</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">🎥 Replays Collaboratifs</h1>
      <table className="w-full border border-slate-300 dark:border-slate-700">
        <thead className="bg-slate-200 dark:bg-slate-800">
          <tr>
            <th className="p-2 text-left">Projet</th>
            <th className="p-2 text-left">Replay</th>
            <th className="p-2 text-left">Date</th>
          </tr>
        </thead>
        <tbody>
          {replays.map((r) => (
            <tr key={r.id} className="border-t dark:border-slate-700">
              <td className="p-2">{r.project?.name || "N/A"}</td>
              <td className="p-2">
                <a
                  href={r.dataUrl}
                  className="text-blue-600 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Télécharger
                </a>
              </td>
              <td className="p-2">{new Date(r.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
