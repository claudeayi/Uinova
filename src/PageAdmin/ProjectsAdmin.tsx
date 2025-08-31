import { useEffect, useState } from "react";
import http from "@/services/http";

export default function ProjectsAdmin() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await http.get("/admin/projects");
        setProjects(res.data);
      } catch (err) {
        console.error("❌ Erreur chargement projets:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, []);

  if (loading) return <p className="text-gray-500">Chargement...</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">📂 Projets</h1>
      <table className="w-full border border-slate-300 dark:border-slate-700">
        <thead className="bg-slate-200 dark:bg-slate-800">
          <tr>
            <th className="p-2 text-left">Nom</th>
            <th className="p-2 text-left">Statut</th>
            <th className="p-2 text-left">Propriétaire</th>
            <th className="p-2 text-left">MAJ</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.id} className="border-t dark:border-slate-700">
              <td className="p-2">{p.name}</td>
              <td className="p-2">{p.status}</td>
              <td className="p-2">{p.owner?.email || "N/A"}</td>
              <td className="p-2">{new Date(p.updatedAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
