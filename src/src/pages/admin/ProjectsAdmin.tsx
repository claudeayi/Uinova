import { useEffect, useState } from "react";
import { getAllProjects, deleteProject, AdminProject } from "@/services/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import DashboardLayout from "@/layouts/DashboardLayout";

export default function ProjectsAdmin() {
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  async function fetchProjects() {
    try {
      setLoading(true);
      const res = await getAllProjects();
      setProjects(res || []);
    } catch (err) {
      console.error("❌ Erreur chargement projets:", err);
      toast.error("Impossible de charger les projets.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(projectId: string) {
    if (!window.confirm("⚠️ Supprimer ce projet définitivement ?")) return;
    try {
      await deleteProject(projectId);
      toast.success("🗑️ Projet supprimé.");
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch (err) {
      console.error("❌ Erreur suppression projet:", err);
      toast.error("Erreur lors de la suppression.");
    }
  }

  useEffect(() => {
    fetchProjects();
  }, []);

  // 🔎 Filtrage + pagination
  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.owner?.email || "").toLowerCase().includes(search.toLowerCase())
  );
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "EN_COURS":
        return "bg-blue-100 text-blue-600";
      case "TERMINE":
        return "bg-green-100 text-green-600";
      case "ERREUR":
        return "bg-red-100 text-red-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <p className="p-6 text-gray-500">⏳ Chargement des projets...</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-bold">📂 Gestion des projets</h1>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Rechercher par nom ou propriétaire..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="border rounded px-3 py-2 w-full md:w-72 dark:bg-slate-900 dark:border-slate-700"
            />
            <Button onClick={fetchProjects}>🔄 Rafraîchir</Button>
          </div>
        </header>

        <p className="text-sm text-gray-500">
          {filtered.length} projet(s) trouvé(s)
        </p>

        {/* Tableau */}
        <Card className="shadow-md rounded-2xl">
          <CardContent className="overflow-x-auto p-0">
            {paginated.length === 0 ? (
              <p className="text-center text-gray-500 py-10">
                Aucun projet trouvé.
              </p>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100 dark:bg-slate-800 text-left">
                    <th className="p-3 border">Nom</th>
                    <th className="p-3 border">Propriétaire</th>
                    <th className="p-3 border">Statut</th>
                    <th className="p-3 border text-center">Pages</th>
                    <th className="p-3 border">Créé le</th>
                    <th className="p-3 border">Dernière maj</th>
                    <th className="p-3 border text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
                    >
                      <td className="p-3 font-medium">{p.name}</td>
                      <td className="p-3">{p.owner?.email || "—"}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 text-xs rounded font-semibold ${getStatusBadge(
                            // @ts-ignore : si status pas encore dans AdminProject
                            p.status
                          )}`}
                        >
                          {p.status || "—"}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-1 text-xs rounded bg-indigo-100 text-indigo-600">
                          {p.pages?.length || 0}
                        </span>
                      </td>
                      <td className="p-3">
                        {new Date(p.createdAt).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="p-3">
                        {p.updatedAt
                          ? new Date(p.updatedAt).toLocaleDateString("fr-FR")
                          : "—"}
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(p.id)}
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
