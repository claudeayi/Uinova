import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

export default function ReplayPage() {
  const { projectId } = useParams();
  const [replays, setReplays] = useState<any[]>([]);

  useEffect(() => {
    axios.get(`/api/replay/${projectId}`).then((res) => setReplays(res.data.data));
  }, [projectId]);

  return (
    <div>
      <h1 className="text-2xl font-bold">🎬 Replays du projet</h1>
      <ul className="mt-4 space-y-2">
        {replays.map((r) => (
          <li key={r.id} className="p-3 bg-white dark:bg-slate-800 rounded shadow">
            <p className="font-semibold">Replay #{r.id}</p>
            <p className="text-sm text-gray-500">Auteur: {r.user?.email}</p>
            <a
              href={r.dataUrl}
              target="_blank"
              rel="noreferrer"
              className="text-indigo-500 hover:underline"
            >
              ▶️ Voir le replay
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
