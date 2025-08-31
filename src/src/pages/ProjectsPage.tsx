// src/pages/ProjectsPage.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getProjects, createProject, deleteProject } from "@/services/projects";
import { useProject } from "@/context/ProjectContext";
import { toast } from "react-hot-toast";
import { PlusCircle, Trash2, FolderOpen } from "lucide-react";

interface Project {
  id: string;
  name: string;
  description?: string;
  status?: string;
  updatedAt: string;
}

export default function ProjectsPage() {
  const { projectId, setProjectId } = useProject();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Charger les projets
  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await getProjects();
        setProjects(res || []);
      } catch (err) {
        console.error("❌ Erreur chargement projets:", err);
        toast.error("Impossible de charger vos projets.");
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, []);

  // Créer un projet rapidement
  async function handleCreate() {
    const name = prompt("Nom du projet ?");
    if (!name) return;
    try {
      const project = await createProject({ name });
      setProjects((prev) => [...prev, project]);
      toast.success("Projet créé ✅");
    } catch (err) {
      console.error("❌ Erreur création projet:", err);
      toast.error("Erreur lors de la création du projet.");
    }
  }

  // Supprimer un projet
  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce projet ?")) return;
    try {
      await deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      if (projectId === id) setProjectId(null);
      toast.success("Projet supprimé 🗑️");
    } catch (err) {
      console.error("❌ Erreur suppression projet:", err);
      toast.error("Erreur lors de la suppression.");
    }
  }

  if (loading) {
    return <p className="text-gray-500">⏳ Chargement des projets...</p>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FolderOpen className="w-6 h-6 text-blue-600" /> Mes projets
        </h1>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <PlusCircle className="w-5 h-5" /> Nouveau projet
        </button>
      </div>

      {/* Liste des projets */}
      {projects.length === 0 ? (
        <p className="text-gray-400">
          Aucun projet trouvé. Créez-en un pour commencer 🚀
        </p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((p) => (
            <div
              key={p.id}
              className={`p-4 rounded-lg shadow bg-white dark:bg-slate-800 border transition hover:shadow-lg ${
                projectId === p.id ? "border-blue-500" : "border-transparent"
              }`}
            >
              <h2 className="text-lg font-semibold">{p.name}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {p.status || "EN_COURS"} • Dernière maj :{" "}
                {new Date(p.updatedAt).toLocaleDateString()}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  to={`/editor/${p.id}`}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                >
                  ✏️ Éditer
                </Link>
                <Link
                  to={`/preview/${p.id}/home`}
                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                >
                  👁️ Preview
                </Link>
                <button
                  onClick={() => setProjectId(p.id)}
                  className={`px-3 py-1 rounded text-sm ${
                    projectId === p.id
                      ? "bg-gray-400 text-white cursor-default"
                      : "bg-purple-600 text-white hover:bg-purple-700"
                  }`}
                  disabled={projectId === p.id}
                >
                  {projectId === p.id ? "✅ Actif" : "🎯 Activer"}
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="ml-auto px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 text-sm flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" /> Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
