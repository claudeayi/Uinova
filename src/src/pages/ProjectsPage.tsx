// src/pages/ProjectsPage.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getProjects, createProject, deleteProject } from "@/services/projects";
import { useProject } from "@/context/ProjectContext";
import { toast } from "react-hot-toast";
import DashboardLayout from "@/layouts/DashboardLayout";
import { PlusCircle, Trash2, FolderOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/* ===============================
   Interfaces
=============================== */
interface Project {
  id: string;
  name: string;
  description?: string;
  status?: string;
  updatedAt: string;
}

/* ===============================
   Projects Page
=============================== */
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

  // Créer un projet
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

  /* ===============================
     Render
  =============================== */
  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FolderOpen className="w-6 h-6 text-blue-600" /> Mes projets
        </h1>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          <PlusCircle className="w-5 h-5" /> Nouveau projet
        </button>
      </div>

      {/* Résumé */}
      {projects.length > 0 && (
        <div className="mb-6 flex gap-4 text-sm">
          <span className="px-3 py-1 rounded bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
            Total : {projects.length}
          </span>
          <span className="px-3 py-1 rounded bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200">
            Publiés : {projects.filter((p) => p.status === "published").length}
          </span>
          <span className="px-3 py-1 rounded bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200">
            Brouillons : {projects.filter((p) => !p.status || p.status === "draft").length}
          </span>
        </div>
      )}

      {/* Liste des projets */}
      {loading ? (
        <p className="text-gray-500">⏳ Chargement des projets...</p>
      ) : projects.length === 0 ? (
        <p className="text-gray-400">Aucun projet trouvé. Créez-en un pour commencer 🚀</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((p) => (
            <Card
              key={p.id}
              className={`hover:shadow-lg transition ${
                projectId === p.id ? "border-2 border-indigo-500" : ""
              }`}
            >
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div>
                  <h2 className="text-lg font-semibold">{p.name}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {p.status || "EN_COURS"} • Dernière maj :{" "}
                    {new Date(p.updatedAt).toLocaleDateString()}
                  </p>
                </div>

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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
