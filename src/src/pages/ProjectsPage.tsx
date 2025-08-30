import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getProjects } from "@/services/projects";
import { useProject } from "@/context/ProjectContext";

export default function ProjectsPage() {
  const { projectId, setProjectId } = useProject();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await getProjects();
        setProjects(res || []);
      } catch (err) {
        console.error("❌ Erreur chargement projets:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, []);

  if (loading) {
    return <p className="text-gray-500">⏳ Chargement des projets...</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">📂 Mes projets</h1>

      {projects.length === 0 ? (
        <p className="text-gray-400">Aucun projet trouvé. Créez-en un pour commencer !</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((p) => (
            <div
              key={p.id}
              className={`p-4 rounded-lg shadow bg-white dark:bg-slate-800 border ${
                projectId === p.id ? "border-blue-500" : "border-transparent"
              }`}
            >
              <h2 className="text-lg font-semibold">{p.name}</h2>
              <p className="text-sm text-gray-500">
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
