// src/pages/TemplateExplorer.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Eye, Download, User, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { duplicateProject } from "@/services/projects";
import DashboardLayout from "@/layouts/DashboardLayout";

/* ============================================================================
 *  TemplateExplorer – Marketplace templates publics
 * ========================================================================== */
interface Template {
  id: string;
  shareId: string;
  name: string;
  status: string;
  updatedAt: string;
  owner?: { id: string; email: string };
}

export default function TemplateExplorer() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [duplicating, setDuplicating] = useState<string | null>(null);

  const { user } = useAuth();
  const navigate = useNavigate();

  async function fetchTemplates() {
    setLoading(true);
    try {
      const res = await axios.get("/api/templates");
      setTemplates(res.data || []);
    } catch (err) {
      console.error("❌ fetchTemplates error:", err);
      toast.error("Impossible de charger les templates.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDuplicate(id: string) {
    try {
      setDuplicating(id);
      const copy = await duplicateProject(id);
      if (copy) {
        toast.success("📂 Template dupliqué dans votre compte !");
        navigate(`/editor/${copy.id}`);
      }
    } catch (err) {
      console.error("❌ duplicateProject error:", err);
      toast.error("Erreur lors de la duplication.");
    } finally {
      setDuplicating(null);
    }
  }

  useEffect(() => {
    fetchTemplates();
  }, []);

  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6 text-indigo-600">
          🛠️ Templates publics
        </h1>

        {loading ? (
          <div className="flex justify-center items-center py-20 text-indigo-500">
            <Loader2 className="animate-spin w-6 h-6 mr-2" />
            Chargement des templates...
          </div>
        ) : templates.length === 0 ? (
          <p className="text-gray-400">Aucun template disponible pour l’instant.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((tpl) => (
              <Card key={tpl.id} className="hover:shadow-lg transition">
                <CardContent className="p-4 flex flex-col h-full justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1">
                      {tpl.name}
                    </h2>
                    <div className="flex gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" /> {tpl.owner?.email || "Anonyme"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(tpl.updatedAt).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                        tpl.status === "published"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {tpl.status}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      to={`/preview/${tpl.shareId}`}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded"
                    >
                      <Eye className="w-4 h-4" /> Aperçu
                    </Link>
                    {user && (
                      <Button
                        size="sm"
                        onClick={() => handleDuplicate(tpl.id)}
                        disabled={duplicating === tpl.id}
                        className="bg-pink-600 text-white hover:bg-pink-700"
                      >
                        {duplicating === tpl.id ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-1" />
                        ) : (
                          <Download className="w-4 h-4 mr-1" />
                        )}
                        Dupliquer
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
