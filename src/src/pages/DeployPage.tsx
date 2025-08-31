import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

export default function DeployPage() {
  const { projectId } = useParams();
  const [status, setStatus] = useState<any>(null);

  const startDeploy = async () => {
    await axios.post(`/api/deploy/${projectId}`);
    toast.success("🚀 Déploiement lancé !");
    fetchStatus();
  };

  const fetchStatus = async () => {
    const res = await axios.get(`/api/deploy/${projectId}/status`);
    setStatus(res.data);
  };

  useEffect(() => {
    fetchStatus();
  }, [projectId]);

  return (
    <div>
      <h1 className="text-2xl font-bold">🚀 Déploiement</h1>
      <button
        onClick={startDeploy}
        className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded"
      >
        Lancer un déploiement
      </button>

      {status && (
        <div className="mt-4 p-4 bg-white dark:bg-slate-800 rounded shadow">
          <h2 className="font-semibold">Statut</h2>
          <p>{status?.data?.status}</p>
          {status?.data?.targetUrl && (
            <a
              href={status.data.targetUrl}
              target="_blank"
              rel="noreferrer"
              className="text-indigo-500 hover:underline"
            >
              🌍 Voir le site déployé
            </a>
          )}
        </div>
      )}
    </div>
  );
}
