import { useEffect, useState } from "react";
import { getAllProjects, deleteProject } from "@/services/admin";
import toast from "react-hot-toast";

export default function ProjectsAdmin() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchProjects() {
    try {
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
    if (!window.confirm("Supprimer ce projet définitivement ?")) return;
    try {
      await deleteProject(projectId);
      toast.success("Projet supprimé");
      setProjects(projects.filter((p) => p.id !== projectId));
    } catch (err) {
      console.error("❌ Erreur suppression projet:", err);
      toast.error("Erreur suppression projet");
    }
  }

  useEffect(() => {
    fetchProjects();
  }, []);

  if (loading) {
    return <p className="p-4 text-gray-500">Chargement...</p>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">📂 Gestion des projets</h1>

      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100 dark:bg-slate-800">
            <th className="p-3 border">Nom</th>
            <th className="p-3 border">Propriétaire</th>
            <th className="p-3 border">Statut</th>
            <th className="p-3 border">Créé le</th>
            <th className="p-3 border">Action</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.id} className="text-center border-b dark:border-slate-700">
              <td className="p-3">{p.name}</td>
              <td className="p-3">{p.owner?.email}</td>
              <td className="p-3">{p.status}</td>
              <td className="p-3">
                {new Date(p.createdAt).toLocaleDateString("fr-FR")}
              </td>
              <td className="p-3">
                <button
                  onClick={() => handleDelete(p.id)}
                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Supprimer
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
