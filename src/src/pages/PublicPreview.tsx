import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Card, CardContent } from "@/components/ui/card";

interface PublicProject {
  id: string;
  name: string;
  pages: { id: string; name: string; content: string }[];
  owner: { email: string };
  updatedAt: string;
}

export default function PublicPreview() {
  const { shareId } = useParams<{ shareId: string }>();
  const [project, setProject] = useState<PublicProject | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchPublicProject() {
    try {
      setLoading(true);
      const res = await axios.get(`/api/preview/${shareId}`);
      setProject(res.data);
    } catch (err) {
      console.error("❌ Erreur preview public:", err);
      toast.error("Lien invalide ou projet non accessible.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (shareId) fetchPublicProject();
  }, [shareId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-indigo-500">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
        <span className="ml-3">Chargement de l’aperçu public...</span>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 text-center text-gray-500">
        ❌ Ce lien de preview n’est plus valide.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <header className="space-y-1 text-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          👁️ Aperçu public : {project.name}
        </h1>
        <p className="text-sm text-gray-500">
          Partagé par {project.owner?.email || "un utilisateur"} • Dernière mise à
          jour {new Date(project.updatedAt).toLocaleString("fr-FR")}
        </p>
      </header>

      {/* Pages preview */}
      {project.pages.length === 0 ? (
        <p className="text-gray-400 text-center">
          Ce projet ne contient aucune page.
        </p>
      ) : (
        project.pages.map((page) => (
          <Card
            key={page.id}
            className="shadow-md rounded-2xl border dark:border-slate-700"
          >
            <CardContent className="p-4 space-y-3">
              <h2 className="font-semibold">{page.name}</h2>
              <iframe
                srcDoc={page.content}
                title={page.name}
                className="w-full h-96 rounded border dark:border-slate-700 bg-white"
              />
            </CardContent>
          </Card>
        ))
      )}

      {/* Footer */}
      <footer className="text-center text-xs text-gray-400 pt-6">
        ⚡ Propulsé par <span className="font-semibold">UInova</span>
      </footer>
    </div>
  );
}
