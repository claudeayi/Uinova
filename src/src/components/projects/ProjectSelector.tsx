import { useEffect, useState } from "react";
import { useProject } from "@/context/ProjectContext";
import { getProjects } from "@/services/projects"; // ⚡ ton service backend

export default function ProjectSelector() {
  const { projectId, setProjectId } = useProject();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await getProjects();
        setProjects(res || []);
      } catch (err) {
        console.error("Erreur chargement projets:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, []);

  if (loading) return <p className="text-sm text-gray-500">Chargement...</p>;

  return (
    <div className="flex items-center space-x-2">
      <label htmlFor="projectSelect" className="text-sm font-medium">
        Projet actif :
      </label>
      <select
        id="projectSelect"
        value={projectId || ""}
        onChange={(e) => setProjectId(e.target.value || null)}
        className="px-2 py-1 rounded border dark:bg-slate-800 dark:border-slate-700"
      >
        <option value="">Aucun</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
}
