import { useEffect, useState } from "react";
import { Dialog } from "@headlessui/react";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import axios from "axios";

interface ShareModalProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
}

export default function ShareModal({ projectId, open, onClose }: ShareModalProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [requireToken, setRequireToken] = useState(true);

  async function generateLink() {
    try {
      setLoading(true);
      const res = await axios.post(`/api/projects/${projectId}/share`, {
        requireToken,
      }, {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") }
      });
      setShareUrl(res.data.url);
      toast.success("✅ Lien de partage généré !");
    } catch (err) {
      console.error("❌ Erreur création lien partage:", err);
      toast.error("Impossible de générer le lien.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) {
      setShareUrl(null);
      setRequireToken(true);
    }
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white dark:bg-slate-900 rounded-xl shadow-lg max-w-lg w-full p-6 space-y-6">
          <Dialog.Title className="text-xl font-bold">
            🔗 Partager le projet
          </Dialog.Title>

          {/* Options */}
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={requireToken}
                onChange={(e) => setRequireToken(e.target.checked)}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Protéger par token (accès sécurisé)
              </span>
            </label>

            <Button onClick={generateLink} disabled={loading}>
              {loading ? "⏳ Génération..." : "⚡ Générer le lien"}
            </Button>
          </div>

          {/* Résultat */}
          {shareUrl && (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Lien généré :</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 border rounded px-3 py-2 text-sm dark:bg-slate-800"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl);
                    toast.success("📋 Lien copié !");
                  }}
                >
                  Copier
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
