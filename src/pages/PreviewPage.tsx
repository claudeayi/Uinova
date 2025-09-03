import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PreviewProject {
  id: string;
  name: string;
  pages: { id: string; name: string; content: string }[];
  updatedAt: string;
}

export default function PreviewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<PreviewProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const navigate = useNavigate();

  async function fetchProject() {
    try {
      setLoading(true);
      const res = await axios.get(`/api/projects/${projectId}/preview`);
      setProject(res.data);
      setPublicUrl(`${window.location.origin}/preview/${projectId}`);
    } catch (err) {
      console.error("❌ Erreur chargement preview:", err);
      toast.error("Impossible de charger l’aperçu.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (projectId) fetchProject();
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-indigo-500">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
        <span className="ml-3">Chargement de l’aperçu...</span>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 text-center text-gray-500">
        ❌ Projet introuvable ou non accessible.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          👁️ Aperçu : {project.name}
        </h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
          >
            ← Retour
          </Button>
          {publicUrl && (
            <Button
              onClick={() => {
                navigator.clipboard.writeText(publicUrl);
                toast.success("🔗 Lien copié !");
              }}
            >
              📋 Copier lien public
            </Button>
          )}
        </div>
      </div>

      {/* Info projet */}
      <p className="text-sm text-gray-500">
        Dernière mise à jour :{" "}
        {new Date(project.updatedAt).toLocaleString("fr-FR")}
      </p>

      {/* Pages en aperçu */}
      {project.pages.length === 0 ? (
        <p className="text-gray-400">Aucune page dans ce projet.</p>
      ) : (
        project.pages.map((page) => (
          <Card key={page.id} className="shadow-md rounded-2xl">
            <CardContent className="p-4 space-y-3">
              <h2 className="font-semibold">{page.name}</h2>
              {/* Aperçu live readonly */}
              <iframe
                srcDoc={page.content}
                title={page.name}
                className="w-full h-96 rounded border dark:border-slate-700 bg-white"
              />
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
