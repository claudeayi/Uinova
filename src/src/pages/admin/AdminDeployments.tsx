// src/pages/admin/AdminDeployments.tsx
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import {
  Loader,
  RefreshCw,
  RotateCcw,
  Globe,
  Terminal,
  Search,
  Copy,
} from "lucide-react";

/* ============================================================================
 * AdminDeployments – Supervision globale des déploiements
 * ========================================================================== */
export default function AdminDeployments() {
  const [deployments, setDeployments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [logModal, setLogModal] = useState<{ open: boolean; logs?: string }>({
    open: false,
  });
  const logsRef = useRef<HTMLPreElement | null>(null);

  /* === API fetch === */
  const fetchDeployments = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/admin/deployments", {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      });
      setDeployments(res.data.data || []);
    } catch (err) {
      console.error("❌ fetchDeployments error:", err);
      toast.error("Impossible de charger les déploiements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeployments();
    const interval = setInterval(fetchDeployments, 30000); // 🔄 auto-refresh toutes les 30s
    return () => clearInterval(interval);
  }, []);

  /* === Helpers === */
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

  const rollback = async (deployId: string) => {
    try {
      await axios.post(
        `/api/admin/deployments/${deployId}/rollback`,
        {},
        { headers: { Authorization: "Bearer " + localStorage.getItem("token") } }
      );
      toast.success("↩️ Rollback lancé");
      fetchDeployments();
    } catch {
      toast.error("Erreur rollback");
    }
  };

  const copyLogs = (logs?: string) => {
    if (!logs) return;
    navigator.clipboard.writeText(logs);
    toast.success("📋 Logs copiés dans le presse-papiers");
  };

  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight; // scroll auto en bas
    }
  }, [logModal.logs]);

  /* === Filtrage === */
  const filtered = deployments.filter((d) => {
    const matchFilter = filter === "ALL" || d.status === filter;
    const matchSearch =
      d.projectName?.toLowerCase().includes(search.toLowerCase()) ||
      d.id?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  /* === Render === */
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center flex-wrap gap-3">
          <h1 className="text-2xl font-bold">📡 Supervision des déploiements</h1>
          <Button variant="outline" onClick={fetchDeployments}>
            <RefreshCw className="w-4 h-4 mr-1" /> Rafraîchir
          </Button>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border rounded dark:bg-slate-800 dark:border-slate-700"
          >
            <option value="ALL">Tous</option>
            <option value="RUNNING">En cours</option>
            <option value="SUCCESS">Succès</option>
            <option value="ERROR">Erreur</option>
          </select>
          <div className="flex items-center gap-2 border rounded px-2 dark:bg-slate-800 dark:border-slate-700">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher projet ou ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-2 py-1 bg-transparent outline-none"
            />
          </div>
        </div>

        {/* Liste */}
        {loading ? (
          <div className="flex justify-center py-20 text-indigo-500">
            <Loader className="w-6 h-6 animate-spin mr-2" />
            Chargement des déploiements...
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-gray-500">Aucun déploiement trouvé.</p>
        ) : (
          <div className="overflow-x-auto rounded shadow">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-100 dark:bg-slate-800">
                <tr>
                  <th className="p-3 text-left">Projet</th>
                  <th className="p-3 text-left">Statut</th>
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">URL</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition"
                  >
                    <td className="p-3 font-medium">{d.projectName}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(
                          d.status
                        )}`}
                      >
                        {d.status}
                      </span>
                    </td>
                    <td className="p-3 text-gray-500">
                      {new Date(d.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3">
                      {d.targetUrl ? (
                        <a
                          href={d.targetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-indigo-600 hover:underline"
                        >
                          <Globe className="w-4 h-4" /> Voir
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="p-3 text-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setLogModal({ open: true, logs: d.logs || "Pas de logs." })
                        }
                      >
                        <Terminal className="w-4 h-4 mr-1" /> Logs
                      </Button>
                      {d.status === "SUCCESS" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => rollback(d.id)}
                        >
                          <RotateCcw className="w-4 h-4 mr-1" /> Rollback
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal logs */}
        {logModal.open && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg max-w-2xl w-full p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Terminal className="w-5 h-5" /> Logs déploiement
              </h2>
              <pre
                ref={logsRef}
                className="p-3 bg-slate-900 text-green-400 text-xs rounded max-h-96 overflow-y-auto"
              >
                {logModal.logs}
              </pre>
              <div className="mt-4 flex justify-between items-center">
                <Button
                  variant="outline"
                  onClick={() => copyLogs(logModal.logs)}
                  className="flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" /> Copier
                </Button>
                <Button onClick={() => setLogModal({ open: false })}>
                  Fermer
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
