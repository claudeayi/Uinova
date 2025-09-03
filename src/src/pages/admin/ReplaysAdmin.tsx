import { useEffect, useState } from "react";
import { getAllReplays, deleteReplay, AdminReplay } from "@/services/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import DashboardLayout from "@/layouts/DashboardLayout";

export default function ReplaysAdmin() {
  const [replays, setReplays] = useState<AdminReplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  async function fetchReplays() {
    try {
      setLoading(true);
      const data = await getAllReplays({ limit: 200 }); // limite backend
      setReplays(data || []);
    } catch (err) {
      console.error("❌ Erreur chargement replays:", err);
      toast.error("Impossible de charger les replays.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("⚠️ Supprimer ce replay définitivement ?")) return;
    try {
      await deleteReplay(id);
      toast.success("🗑️ Replay supprimé.");
      setReplays((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("❌ Erreur suppression replay:", err);
      toast.error("Erreur lors de la suppression.");
    }
  }

  useEffect(() => {
    fetchReplays();
  }, []);

  // 🔎 Filtrage + pagination
  const filtered = replays.filter(
    (r) =>
      r.projectId.toLowerCase().includes(search.toLowerCase()) ||
      (r.user?.email || "").toLowerCase().includes(search.toLowerCase())
  );
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-bold">🎬 Gestion des replays</h1>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Rechercher par projet ou utilisateur..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="border rounded px-3 py-2 w-full md:w-72 dark:bg-slate-900 dark:border-slate-700"
            />
            <Button variant="outline" onClick={fetchReplays}>
              🔄 Rafraîchir
            </Button>
          </div>
        </header>

        {/* Info résultats */}
        {loading ? (
          <p className="p-6 text-gray-500">⏳ Chargement des replays...</p>
        ) : (
          <p className="text-sm text-gray-500">
            {filtered.length} replay(s) trouvé(s)
          </p>
        )}

        {/* Tableau */}
        <Card className="shadow-md rounded-2xl">
          <CardContent className="overflow-x-auto p-0">
            {loading ? (
              <div className="text-center py-10 text-gray-500">Chargement...</div>
            ) : paginated.length === 0 ? (
              <p className="text-center text-gray-500 py-10">
                Aucun replay trouvé.
              </p>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100 dark:bg-slate-800 text-left">
                    <th className="p-3 border">Projet</th>
                    <th className="p-3 border">Utilisateur</th>
                    <th className="p-3 border">Date</th>
                    <th className="p-3 border">Aperçu</th>
                    <th className="p-3 border text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition"
                    >
                      <td className="p-3 font-medium">{r.projectId}</td>
                      <td className="p-3">{r.user?.email || "—"}</td>
                      <td className="p-3">
                        {new Date(r.createdAt).toLocaleString("fr-FR")}
                      </td>
                      <td className="p-3">
                        {r.dataUrl?.endsWith(".mp4") ? (
                          <video
                            src={r.dataUrl}
                            className="w-32 rounded border"
                            controls
                          />
                        ) : r.dataUrl ? (
                          <a
                            href={r.dataUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-600 hover:underline"
                          >
                            ▶️ Voir
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(r.id)}
                        >
                          🗑️ Supprimer
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-4 space-x-2">
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              ← Précédent
            </Button>
            <span className="px-3 py-1">
              Page {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Suivant →
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
