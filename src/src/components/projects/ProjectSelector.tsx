import { useEffect, useState } from "react";
import { useProject } from "@/context/ProjectContext";
import { getProjects } from "@/services/projects"; // API backend
import { RotateCcw } from "lucide-react";

export default function ProjectSelector() {
  const { projectId, setProjectId } = useProject();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les projets
  async function fetchProjects() {
    try {
      setLoading(true);
      setError(null);
      const res = await getProjects();
      setProjects(res || []);
    } catch (err) {
      console.error("❌ Erreur chargement projets:", err);
      setError("Impossible de charger vos projets.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProjects();
  }, []);

  // Sauvegarder et restaurer le dernier projet sélectionné
  useEffect(() => {
    if (projectId) localStorage.setItem("uinova:lastProject", projectId);
  }, [projectId]);

  useEffect(() => {
    const saved = localStorage.getItem("uinova:lastProject");
    if (saved && !projectId) setProjectId(saved);
  }, []);

  /* ------------------------------
     Rendu
  ------------------------------ */
  if (loading) {
    return (
      <span className="flex items-center text-sm text-gray-500 gap-2">
        <svg
          className="animate-spin h-4 w-4 text-indigo-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          />
        </svg>
        Chargement...
      </span>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-500">
        {error}
        <button
          onClick={fetchProjects}
          className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 transition"
        >
          <RotateCcw size={14} /> Réessayer
        </button>
      </div>
    );
  }

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
        aria-label="Sélection du projet actif"
        value={projectId || ""}
        onChange={(e) => setProjectId(e.target.value || null)}
        className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 
                   bg-white dark:bg-slate-800 text-sm focus:outline-none 
                   focus:ring-2 focus:ring-indigo-500 transition"
      >
        <option value="" className="italic text-gray-400">
          — Aucun projet sélectionné —
        </option>
        {projects.map((p) => (
          <option key={p.id} value={p.id} title={p.name}>
            {p.name.length > 25 ? p.name.slice(0, 25) + "…" : p.name}
          </option>
        ))}
      </select>

      {/* Infos nombre de projets */}
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {projects.length} projet{projects.length > 1 ? "s" : ""}
      </span>
    </div>
  );
}
