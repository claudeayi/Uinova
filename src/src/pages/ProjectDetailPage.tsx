// src/pages/ProjectDetailPage.tsx
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  getProject,
  deleteProject,
  updateProject,
} from "@/services/projects";
import { useProject } from "@/context/ProjectContext";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import {
  ArrowLeft,
  Pencil,
  Eye,
  Trash2,
  Rocket,
  Layers,
  Calendar,
  Copy,
  Archive,
  Undo2,
} from "lucide-react";

/* ============================================================================
 *  Interfaces
 * ========================================================================== */
interface Project {
  id: string;
  name: string;
  description?: string;
  status?: "published" | "draft" | "archived";
  updatedAt: string;
  createdAt: string;
  pages?: { id: string; name: string }[];
}

/* ============================================================================
 *  Project Detail Page
 * ========================================================================== */
export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setProjectId } = useProject();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  // Charger un projet
  useEffect(() => {
    async function fetchProject() {
      try {
        if (!id) return;
        const res = await getProject(id);
        setProject(res);
      } catch (err) {
        console.error("❌ Erreur chargement projet:", err);
        toast.error("Impossible de charger ce projet.");
      } finally {
        setLoading(false);
      }
    }
    fetchProject();
  }, [id]);

  // Supprimer un projet
  async function handleDelete() {
    if (!id) return;
    if (!confirm("⚠️ Supprimer ce projet définitivement ?")) return;
    try {
      await deleteProject(id);
      toast.success("🗑️ Projet supprimé");
      navigate("/projects");
    } catch (err) {
      console.error("❌ Erreur suppression:", err);
      toast.error("Erreur lors de la suppression.");
    }
  }

  // Archiver/Désarchiver
  async function toggleArchive() {
    if (!project) return;
    try {
      const newStatus = project.status === "archived" ? "draft" : "archived";
      await updateProject(project.id, { status: newStatus });
      setProject({ ...project, status: newStatus });
      toast.success(
        newStatus === "archived"
          ? "📦 Projet archivé"
          : "📂 Projet restauré"
      );
    } catch (err) {
      console.error("❌ Archive error:", err);
      toast.error("Impossible de mettre à jour le statut.");
    }
  }

  // Dupliquer localement
  function handleDuplicate() {
    if (!project) return;
    const copy = {
      ...project,
      id: crypto.randomUUID(),
      name: project.name + " (copie)",
      updatedAt: new Date().toISOString(),
    };
    toast.success("📑 Copie locale du projet créée");
    console.log("Projet dupliqué:", copy);
  }

  // Déploiement (mock)
  function handleDeploy() {
    toast.success("🚀 Déploiement lancé !");
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center py-20 text-indigo-500">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
          <span className="ml-3">Chargement du projet...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout>
        <div className="p-6 text-center text-red-500">
          ❌ Projet introuvable
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center flex-wrap gap-3">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="w-6 h-6 text-indigo-600" /> {project.name}
          </h1>
          <Button variant="outline" onClick={() => navigate("/projects")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Retour
          </Button>
        </div>

        {/* Infos principales */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <p className="text-gray-600 dark:text-gray-300">
              {project.description || "Aucune description fournie."}
            </p>
            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" /> Créé le :{" "}
                {new Date(project.createdAt).toLocaleDateString("fr-FR")}
              </span>
              <span className="flex items-center gap-1">
                🔄 Dernière maj :{" "}
                {new Date(project.updatedAt).toLocaleDateString("fr-FR")}
              </span>
              <StatusBadge status={project.status} />
              <span>📑 {project.pages?.length || 0} pages</span>
            </div>
          </CardContent>
        </Card>

        {/* Pages */}
        <Card>
          <CardContent className="p-6 space-y-2">
            <h2 className="font-semibold text-lg mb-2">📑 Pages</h2>
            {project.pages && project.pages.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {project.pages.map((pg) => (
                  <li
                    key={pg.id}
                    className="flex justify-between items-center p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <span>{pg.name}</span>
                    <Link
                      to={`/preview/${project.id}/${pg.id}`}
                      className="text-indigo-600 hover:underline text-xs"
                    >
                      Voir
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400 text-sm">Aucune page définie.</p>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Link
            to={`/editor/${project.id}`}
            className="btn-primary flex items-center gap-2"
            onClick={() => setProjectId(project.id)}
          >
            <Pencil className="w-4 h-4" /> Éditer
          </Link>
          <Link
            to={`/preview/${project.id}/home`}
            className="btn-secondary flex items-center gap-2"
          >
            <Eye className="w-4 h-4" /> Preview
          </Link>
          <Button
            onClick={() => setProjectId(project.id)}
            variant="outline"
            className="flex items-center gap-2"
          >
            🎯 Activer
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleDuplicate}
            className="flex items-center gap-2"
          >
            <Copy className="w-4 h-4" /> Dupliquer
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={toggleArchive}
            className="flex items-center gap-2"
          >
            {project.status === "archived" ? (
              <>
                <Undo2 className="w-4 h-4" /> Restaurer
              </>
            ) : (
              <>
                <Archive className="w-4 h-4" /> Archiver
              </>
            )}
          </Button>
          <Button
            onClick={handleDelete}
            variant="destructive"
            className="flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" /> Supprimer
          </Button>
          <Button
            onClick={handleDeploy}
            variant="default"
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
          >
            <Rocket className="w-4 h-4" /> Déployer
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

/* ============================================================================
 *  Badge utilitaire
 * ========================================================================== */
function StatusBadge({ status }: { status?: Project["status"] }) {
  if (status === "published")
    return (
      <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
        ✅ Publié
      </span>
    );
  if (status === "archived")
    return (
      <span className="px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 text-xs font-medium">
        📦 Archivé
      </span>
    );
  return (
    <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium">
      📝 Brouillon
    </span>
  );
}
