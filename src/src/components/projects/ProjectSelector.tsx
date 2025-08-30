import { useEffect, useState } from "react";
import { useProject } from "@/context/ProjectContext";
import { getProjects } from "@/services/projects"; // API backend

export default function ProjectSelector() {
  const { projectId, setProjectId } = useProject();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await getProjects();
        setProjects(res || []);
      } catch (err) {
        console.error("❌ Erreur chargement projets:", err);
        setError("Impossible de charger vos projets");
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, []);

  if (loading) return <span className="text-sm text-gray-500">⏳ Chargement...</span>;
  if (error) return <span className="text-sm text-red-500">{error}</span>;

  return (
    <div className="flex items-center space-x-2">
      <label
        htmlFor="projectSelect"
        className="text-sm font-medium hidden md:inline"
      >
        Projet actif :
      </label>
      <select
        id="projectSelect"
        value={projectId || ""}
        onChange={(e) => setProjectId(e.target.value || null)}
        className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 
                   bg-white dark:bg-slate-800 text-sm"
      >
        <option value="">— Aucun projet sélectionné —</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      {/* Affiche le nombre de projets disponibles */}
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {projects.length} projet{projects.length > 1 ? "s" : ""}
      </span>
    </div>
  );
}
