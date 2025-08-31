// src/pages/DeployPage.tsx
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

export default function DeployPage() {
  const { projectId } = useParams();
  const [status, setStatus] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  /* ===============================
   * API Calls
   * =============================== */
  const fetchStatus = async () => {
    if (!projectId) return;
    try {
      const res = await axios.get(`/api/deploy/${projectId}/status`, {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      });
      setStatus(res.data);
    } catch (err) {
      console.error("❌ fetchStatus error", err);
      toast.error("Erreur récupération statut déploiement");
    }
  };

  const fetchHistory = async () => {
    if (!projectId) return;
    try {
      const res = await axios.get(`/api/deploy/${projectId}/history`, {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      });
      setHistory(res.data.data || []);
    } catch (err) {
      console.error("❌ fetchHistory error", err);
    }
  };

  const startDeploy = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      await axios.post(`/api/deploy/${projectId}`, {}, {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      });
      toast.success("🚀 Déploiement lancé !");
      fetchStatus();
      fetchHistory();
    } catch (err) {
      toast.error("Impossible de lancer le déploiement");
    } finally {
      setLoading(false);
    }
  };

  const cancelDeploy = async () => {
    try {
      await axios.post(`/api/deploy/${projectId}/cancel`, {}, {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      });
      toast.success("❌ Déploiement annulé");
      fetchStatus();
      fetchHistory();
    } catch {
      toast.error("Erreur annulation déploiement");
    }
  };

  const restartDeploy = async () => {
    try {
      await axios.post(`/api/deploy/${projectId}/restart`, {}, {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      });
      toast.success("🔄 Déploiement relancé");
      fetchStatus();
      fetchHistory();
    } catch {
      toast.error("Erreur lors du redémarrage");
    }
  };

  /* ===============================
   * Effects
   * =============================== */
  useEffect(() => {
    fetchStatus();
    fetchHistory();
  }, [projectId]);

  /* ===============================
   * Render
   * =============================== */
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">🚀 Déploiement du projet</h1>

      <div className="space-x-3">
        <button
          onClick={startDeploy}
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "..." : "Lancer un déploiement"}
        </button>
        {status?.data?.status === "RUNNING" && (
          <button
            onClick={cancelDeploy}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            ❌ Annuler
          </button>
        )}
        {status?.data?.status === "ERROR" && (
          <button
            onClick={restartDeploy}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
          >
            🔄 Relancer
          </button>
        )}
      </div>

      {/* Statut courant */}
      {status && (
        <div className="mt-4 p-4 bg-white dark:bg-slate-800 rounded shadow">
          <h2 className="font-semibold">Statut actuel</h2>
          <p className="mb-2">
            {status?.data?.status || "Inconnu"}
          </p>
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
          {status?.data?.logs && (
            <pre className="mt-3 p-2 bg-slate-900 text-green-400 rounded text-xs overflow-x-auto">
              {status.data.logs}
            </pre>
          )}
        </div>
      )}

      {/* Historique */}
      {history.length > 0 && (
        <div className="mt-6">
          <h2 className="font-semibold mb-2">🕒 Historique des déploiements</h2>
          <ul className="space-y-2">
            {history.map((d) => (
              <li
                key={d.id}
                className="p-3 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              >
                <p>
                  {new Date(d.createdAt).toLocaleString()} →{" "}
                  <span className="font-semibold">{d.status}</span>
                </p>
                {d.targetUrl && (
                  <a
                    href={d.targetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-500 hover:underline"
                  >
                    🌍 Voir le déploiement
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
