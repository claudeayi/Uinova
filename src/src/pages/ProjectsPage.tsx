// src/pages/ProjectsPage.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getProjects,
  createProject,
  deleteProject,
} from "@/services/projects";
import { useProject } from "@/context/ProjectContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { toast } from "react-hot-toast";
import DashboardLayout from "@/layouts/DashboardLayout";
import {
  PlusCircle,
  Trash2,
  FolderOpen,
  Copy,
  Eye,
  Pencil,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

/* ============================================================================
 *  Interfaces
 * ========================================================================== */
interface Project {
  id: string;
  name: string;
  description?: string;
  status?: "published" | "draft" | "archived";
  updatedAt: string;
}

/* ============================================================================
 *  Projects Page
 * ========================================================================== */
export default function ProjectsPage() {
  const { projectId, setProjectId } = useProject();
  const { current: workspace } = useWorkspace();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const limit = 6;

  // Charger les projets
  useEffect(() => {
    async function fetchProjects() {
      if (!workspace) return;
      setLoading(true);
      try {
        const res = await getProjects(workspace.id);
        setProjects(res || []);
      } catch (err) {
        console.error("❌ Erreur chargement projets:", err);
        toast.error("Impossible de charger vos projets.");
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, [workspace]);

  // Créer un projet
  async function handleCreate() {
    if (!newName.trim() || !workspace) return;
    setCreating(true);
    try {
      const project = await createProject({ name: newName, workspaceId: workspace.id });
      setProjects((prev) => [...prev, project]);
      toast.success("✅ Projet créé");
      setNewName("");
    } catch (err) {
      console.error("❌ Erreur création projet:", err);
      toast.error("Erreur lors de la création du projet.");
    } finally {
      setCreating(false);
    }
  }

  // Supprimer un projet
  async function handleDelete(id: string) {
    if (!confirm("⚠️ Supprimer ce projet ?")) return;
    try {
      await deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      if (projectId === id) setProjectId(null);
      toast.success("🗑️ Projet supprimé");
    } catch (err) {
      console.error("❌ Erreur suppression projet:", err);
      toast.error("Erreur lors de la suppression.");
    }
  }

  // Dupliquer un projet (mock local)
  function handleDuplicate(project: Project) {
    const copy: Project = {
      ...project,
      id: crypto.randomUUID(),
      name: project.name + " (copie)",
      updatedAt: new Date().toISOString(),
    };
    setProjects((prev) => [...prev, copy]);
    toast.success("📂 Projet dupliqué");
  }

  /* ============================================================================
   *  Filtrage + Pagination
   * ========================================================================== */
  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );
  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + limit);
  const totalPages = Math.ceil(filtered.length / limit);

  /* ============================================================================
   *  Render
   * ========================================================================== */
  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FolderOpen className="w-6 h-6 text-blue-600" /> Mes projets
        </h1>
        <div className="flex gap-3">
          <Input
            type="text"
            placeholder="🔍 Rechercher..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-56"
          />
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 text-white">
                <PlusCircle className="w-5 h-5 mr-2" /> Nouveau
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouveau projet</DialogTitle>
              </DialogHeader>
              <Input
                placeholder="Nom du projet"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <DialogFooter>
                <Button
                  onClick={handleCreate}
                  disabled={creating || !newName.trim()}
                >
                  {creating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Créer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Résumé */}
      {projects.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-3 text-xs">
          <Badge label={`Total : ${projects.length}`} color="blue" />
          <Badge
            label={`Publiés : ${projects.filter((p) => p.status === "published").length}`}
            color="green"
          />
          <Badge
            label={`Brouillons : ${projects.filter((p) => !p.status || p.status === "draft").length}`}
            color="yellow"
          />
        </div>
      )}

      {/* Liste des projets */}
      {loading ? (
        <div className="flex justify-center items-center py-12 text-indigo-600">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Chargement...
        </div>
      ) : projects.length === 0 ? (
        <p className="text-gray-400">
          Aucun projet trouvé dans ce workspace. Créez-en un pour commencer 🚀
        </p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginated.map((p) => (
            <Card
              key={p.id}
              className={`hover:shadow-lg transition ${
                projectId === p.id ? "border-2 border-indigo-500" : ""
              }`}
            >
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div>
                  <h2 className="text-lg font-semibold">{p.name}</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {p.status || "draft"} • Dernière maj :{" "}
                    {new Date(p.updatedAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Link to={`/editor/${p.id}`} className="btn-primary">
                    <Pencil className="w-4 h-4" /> Éditer
                  </Link>
                  <Link to={`/preview/${p.id}/home`} className="btn-secondary">
                    <Eye className="w-4 h-4" /> Preview
                  </Link>
                  <Button
                    size="sm"
                    variant={projectId === p.id ? "outline" : "default"}
                    onClick={() => setProjectId(p.id)}
                    disabled={projectId === p.id}
                  >
                    {projectId === p.id ? "✅ Actif" : "🎯 Activer"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDuplicate(p)}>
                    <Copy className="w-4 h-4" /> Dupliquer
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(p.id)}>
                    <Trash2 className="w-4 h-4" /> Supprimer
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-6">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ◀️ Précédent
          </Button>
          <span className="text-sm">
            Page {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Suivant ▶️
          </Button>
        </div>
      )}
    </DashboardLayout>
  );
}

/* ============================================================================
 *  Badge utilitaire
 * ========================================================================== */
function Badge({ label, color }: { label: string; color: "blue" | "green" | "yellow" }) {
  const colors = {
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200",
    green: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200",
    yellow: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
      {label}
    </span>
  );
}
