// src/pages/admin/ProjectsAdmin.tsx
import { useEffect, useState } from "react";
import { getAllProjects, deleteProject } from "@/services/admin";
import toast from "react-hot-toast";

export default function ProjectsAdmin() {
  const [projects, setProjects] = useState<any[]>([]);
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
      toast.error("Impossible de charger les projets");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(projectId: string) {
    if (!window.confirm("⚠️ Supprimer ce projet définitivement ?")) return;
    try {
      await deleteProject(projectId);
      toast.success("🗑️ Projet supprimé");
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch (err) {
      console.error("❌ Erreur suppression projet:", err);
      toast.error("Erreur suppression projet");
    }
  }

  useEffect(() => {
    fetchProjects();
  }, []);

  if (loading) return <p className="p-6 text-gray-500">⏳ Chargement...</p>;

  // 🔎 Filtre + pagination
  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.owner?.email || "").toLowerCase().includes(search.toLowerCase())
  );
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-center">
        <h1 className="text-2xl font-bold mb-4 md:mb-0">📂 Gestion des projets</h1>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Rechercher par nom ou propriétaire..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="border rounded px-3 py-2 w-full md:w-72"
          />
          <button
            onClick={fetchProjects}
            className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            🔄 Rafraîchir
          </button>
        </div>
      </header>

      <p className="text-sm text-gray-500">{filtered.length} projet(s)</p>

      {/* Tableau */}
      <div className="overflow-x-auto rounded shadow">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100 dark:bg-slate-800 text-left">
              <th className="p-3 border">Nom</th>
              <th className="p-3 border">Propriétaire</th>
              <th className="p-3 border">Statut</th>
              <th className="p-3 border">Pages</th>
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
                    className={`px-2 py-1 text-xs rounded ${
                      p.status === "EN_COURS"
                        ? "bg-blue-100 text-blue-600"
                        : p.status === "TERMINE"
                        ? "bg-green-100 text-green-600"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {p.status}
                  </span>
                </td>
                <td className="p-3 text-center">{p.pages?.length || 0}</td>
                <td className="p-3">{new Date(p.createdAt).toLocaleDateString("fr-FR")}</td>
                <td className="p-3">{new Date(p.updatedAt).toLocaleDateString("fr-FR")}</td>
                <td className="p-3 text-center">
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                  >
                    🗑️ Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-4 space-x-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 rounded border disabled:opacity-50"
          >
            ← Précédent
          </button>
          <span className="px-3 py-1">
            Page {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 rounded border disabled:opacity-50"
          >
            Suivant →
          </button>
        </div>
      )}
    </div>
  );
}
