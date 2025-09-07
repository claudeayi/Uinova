import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";

interface ShareModalProps {
  projectId: string;
  onClose: () => void;
}

type ShareResponse = {
  url: string;
  expiresAt?: string; // ✅ nouvelle info optionnelle côté backend
};

export default function ShareModal({ projectId, onClose }: ShareModalProps) {
  const [share, setShare] = useState<ShareResponse | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchShare() {
    try {
      setLoading(true);
      const res = await axios.get(`/api/projects/${projectId}/share`, {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      });
      setShare(res.data || null);
    } catch (err) {
      console.error("❌ fetchShare error:", err);
      toast.error("Impossible de charger le lien de partage.");
    } finally {
      setLoading(false);
    }
  }

  async function generateShare() {
    try {
      const res = await axios.post<ShareResponse>(
        `/api/projects/${projectId}/share`,
        {},
        { headers: { Authorization: "Bearer " + localStorage.getItem("token") } }
      );
      setShare(res.data);
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
      setShare(null);
      toast.success("🗑️ Lien de partage désactivé.");
    } catch (err) {
      console.error("❌ disableShare error:", err);
      toast.error("Impossible de désactiver le lien.");
    }
  }

  function copyToClipboard() {
    if (!share?.url) return;
    navigator.clipboard.writeText(share.url);
    toast.success("🔗 Lien copié dans le presse-papier !");
  }

  useEffect(() => {
    fetchShare();
  }, [projectId]);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg w-full max-w-lg p-6 space-y-6 transition">
        <h2 id="share-modal-title" className="text-xl font-bold flex items-center gap-2">
          🔗 Partage du projet
        </h2>

        {loading ? (
          <p className="text-gray-500">⏳ Chargement...</p>
        ) : share ? (
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              Ce projet est <strong>accessible publiquement</strong> via le lien ci-dessous :
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={share.url}
                readOnly
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="flex-1 px-3 py-2 border rounded dark:bg-slate-800 text-sm cursor-text"
              />
              <Button size="sm" onClick={copyToClipboard} variant="secondary">
                📋 Copier
              </Button>
              <Button size="sm" asChild>
                <a href={share.url} target="_blank" rel="noopener noreferrer">
                  🔎 Ouvrir
                </a>
              </Button>
            </div>

            {/* Infos expiration */}
            {share.expiresAt && (
              <p className="text-xs text-gray-500">
                ⏰ Expire le {new Date(share.expiresAt).toLocaleString()}
              </p>
            )}

            <Button variant="destructive" className="w-full" onClick={disableShare}>
              🛑 Désactiver le partage
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
