import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";

interface ShareModalProps {
  projectId: string;
  onClose: () => void;
}

export default function ShareModal({ projectId, onClose }: ShareModalProps) {
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchShare() {
    try {
      setLoading(true);
      const res = await axios.get(`/api/projects/${projectId}/share`, {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      });
      setShareLink(res.data?.url || null);
    } catch (err) {
      console.error("❌ fetchShare error:", err);
      toast.error("Impossible de charger le lien de partage.");
    } finally {
      setLoading(false);
    }
  }

  async function generateShare() {
    try {
      const res = await axios.post(
        `/api/projects/${projectId}/share`,
        {},
        {
          headers: { Authorization: "Bearer " + localStorage.getItem("token") },
        }
      );
      setShareLink(res.data?.url);
      toast.success("✅ Lien de partage généré !");
    } catch (err) {
      console.error("❌ generateShare error:", err);
      toast.error("Impossible de générer le lien.");
    }
  }

  async function disableShare() {
    if (!window.confirm("Voulez-vous désactiver ce lien public ?")) return;
    try {
      await axios.delete(`/api/projects/${projectId}/share`, {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      });
      setShareLink(null);
      toast.success("🗑️ Lien de partage désactivé.");
    } catch (err) {
      console.error("❌ disableShare error:", err);
      toast.error("Impossible de désactiver le lien.");
    }
  }

  function copyToClipboard() {
    if (!shareLink) return;
    navigator.clipboard.writeText(shareLink);
    toast.success("🔗 Lien copié dans le presse-papier !");
  }

  useEffect(() => {
    fetchShare();
  }, [projectId]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg w-full max-w-lg p-6 space-y-6">
        <h2 className="text-xl font-bold">🔗 Partage du projet</h2>

        {loading ? (
          <p className="text-gray-500">⏳ Chargement...</p>
        ) : (
          <>
            {shareLink ? (
              <div className="space-y-4">
                <p className="text-gray-700 dark:text-gray-300">
                  Ce projet est <strong>accessible publiquement</strong> via le lien ci-dessous :
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={shareLink}
                    readOnly
                    className="flex-1 px-3 py-2 border rounded dark:bg-slate-800 text-sm"
                  />
                  <Button size="sm" onClick={copyToClipboard}>
                    📋 Copier
                  </Button>
                </div>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={disableShare}
                >
                  Désactiver le partage
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-700 dark:text-gray-300">
                  Aucun lien de partage n’est actif pour ce projet.
                </p>
                <Button className="w-full" onClick={generateShare}>
                  ➕ Générer un lien public
                </Button>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="text-right">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
}
