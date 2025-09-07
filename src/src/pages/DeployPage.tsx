// src/pages/DeployPage.tsx
import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  Rocket,
  Ban,
  RotateCcw,
  Loader,
  Globe,
  Terminal,
  FileDown,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import io from "socket.io-client";

/* ============================================================================
 * DeployPage – UInova v2
 *  ✅ Déploiement + Annulation + Relance + Rollback
 *  ✅ Logs temps réel via WebSocket
 *  ✅ Téléchargement logs
 *  ✅ Hotkeys enrichies (r, d, l)
 * ========================================================================== */
export default function DeployPage() {
  const { projectId } = useParams();
  const [status, setStatus] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);

  const logRef = useRef<HTMLPreElement>(null);

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
      if (res.data?.status === "RUNNING" && !startTime) {
        setStartTime(Date.now());
      }
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
      await axios.post(
        `/api/deploy/${projectId}`,
        {},
        { headers: { Authorization: "Bearer " + localStorage.getItem("token") } }
      );
      toast.success("🚀 Déploiement lancé !");
      setLogs([]);
      setStartTime(Date.now());
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
      await axios.post(
        `/api/deploy/${projectId}/cancel`,
        {},
        { headers: { Authorization: "Bearer " + localStorage.getItem("token") } }
      );
      toast.success("❌ Déploiement annulé");
      fetchStatus();
      fetchHistory();
    } catch {
      toast.error("Erreur annulation déploiement");
    }
  };

  const restartDeploy = async () => {
    try {
      await axios.post(
        `/api/deploy/${projectId}/restart`,
        {},
        { headers: { Authorization: "Bearer " + localStorage.getItem("token") } }
      );
      toast.success("🔄 Déploiement relancé");
      fetchStatus();
      fetchHistory();
    } catch {
      toast.error("Erreur lors du redémarrage");
    }
  };

  const rollbackDeploy = async (deployId: string) => {
    try {
      await axios.post(
        `/api/deploy/${projectId}/rollback/${deployId}`,
        {},
        { headers: { Authorization: "Bearer " + localStorage.getItem("token") } }
      );
      toast.success("↩️ Rollback effectué !");
      fetchStatus();
      fetchHistory();
    } catch {
      toast.error("Erreur rollback");
    }
  };

  /* ===============================
   * WebSocket Logs temps réel
   * =============================== */
  useEffect(() => {
    if (!projectId) return;
    const socket = io("http://localhost:5000", {
      auth: { token: localStorage.getItem("token") },
    });

    socket.on("deploy:log", (line: string) => {
      setLogs((prev) => [...prev, line]);
    });
    socket.on("deploy:status", (s: any) => {
      setStatus(s);
    });

    return () => {
      socket.disconnect();
    };
  }, [projectId]);

  /* Auto-scroll logs */
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  /* Hotkeys */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "r") fetchStatus();
      if (e.key === "d") startDeploy();
      if (e.key === "l" && logs.length > 0) downloadLogs();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  /* ===============================
   * Helpers
   * =============================== */
  const getStatusColor = (s: string) => {
    switch (s) {
      case "SUCCESS":
        return "bg-green-100 text-green-700";
      case "ERROR":
        return "bg-red-100 text-red-700";
      case "RUNNING":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const downloadLogs = () => {
    const blob = new Blob([logs.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deploy-${projectId}.log`;
    a.click();
  };

  const elapsedTime = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;

  /* ===============================
   * Render
   * =============================== */
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">🚀 Déploiement du projet</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchStatus}>
              <RefreshCw className="w-4 h-4 mr-1" /> Rafraîchir
            </Button>
            {logs.length > 0 && (
              <Button variant="outline" onClick={downloadLogs}>
                <FileDown className="w-4 h-4 mr-1" /> Télécharger logs
              </Button>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="space-x-3">
          <Button
            onClick={startDeploy}
            disabled={loading}
            className="bg-indigo-600 text-white hover:bg-indigo-700"
          >
            {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
            {loading ? "Déploiement..." : "Lancer un déploiement"}
          </Button>
          {status?.status === "RUNNING" && (
            <Button onClick={cancelDeploy} variant="destructive">
              <Ban className="w-4 h-4 mr-1" /> Annuler
            </Button>
          )}
          {status?.status === "ERROR" && (
            <Button onClick={restartDeploy} className="bg-yellow-500 hover:bg-yellow-600 text-white">
              <RotateCcw className="w-4 h-4 mr-1" /> Relancer
            </Button>
          )}
        </div>

        {/* Statut courant */}
        {status && (
          <div className="mt-4 p-4 bg-white dark:bg-slate-800 rounded shadow space-y-3">
            <h2 className="font-semibold flex items-center gap-2">
              📡 Statut actuel
              {status?.status === "RUNNING" && (
                <span className="ml-2 text-xs flex items-center gap-1 text-yellow-600">
                  <Clock className="w-4 h-4" /> {elapsedTime}s écoulées
                </span>
              )}
            </h2>
            <p
              className={`inline-block px-2 py-1 rounded text-sm font-semibold ${getStatusColor(
                status?.status
              )}`}
            >
              {status?.status || "Inconnu"}
            </p>

            {status?.targetUrl && (
              <p className="mt-2">
                <a
                  href={status.targetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-indigo-600 hover:underline"
                >
                  <Globe className="w-4 h-4" /> Voir le site déployé
                </a>
              </p>
            )}

            {logs.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Terminal className="w-4 h-4" /> Logs en temps réel
                </h3>
                <pre
                  ref={logRef}
                  className="mt-2 p-3 bg-slate-900 text-green-400 rounded text-xs overflow-y-auto max-h-64"
                >
                  {logs.join("\n")}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Historique */}
        {history.length > 0 && (
          <div className="mt-6">
            <h2 className="font-semibold mb-2">🕒 Historique des déploiements</h2>
            <ol className="relative border-l border-slate-300 dark:border-slate-700">
              {history.map((d) => (
                <li key={d.id} className="mb-6 ml-4">
                  <div
                    className={`absolute w-3 h-3 rounded-full -left-1.5 border border-white ${getStatusColor(
                      d.status
                    )}`}
                  ></div>
                  <time className="block text-xs text-gray-500">
                    {new Date(d.createdAt).toLocaleString()}
                  </time>
                  <p className="font-semibold flex items-center gap-1">
                    {d.status === "SUCCESS" && <CheckCircle className="w-4 h-4 text-green-500" />}
                    {d.status === "ERROR" && <XCircle className="w-4 h-4 text-red-500" />}
                    {d.status === "RUNNING" && <Clock className="w-4 h-4 text-yellow-500" />}
                    {d.status}
                  </p>
                  <div className="flex gap-2 mt-1">
                    {d.targetUrl && (
                      <a
                        href={d.targetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-500 hover:underline text-sm"
                      >
                        🌍 Voir
                      </a>
                    )}
                    {d.status === "SUCCESS" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => rollbackDeploy(d.id)}
                      >
                        ↩️ Rollback
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
