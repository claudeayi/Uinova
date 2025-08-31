// src/pages/EditorPage.tsx
import { useAppStore } from "../store/useAppStore";
import ShareModal from "../components/ShareModal";
import LiveEditor from "../components/Editor/LiveEditor";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { Play, Save, Share2, Download, Monitor, Activity } from "lucide-react";
import { saveProject } from "@/services/projects";
import { useNavigate } from "react-router-dom";

export default function EditorPage() {
  const { currentProjectId, currentPageId, project, setProject } = useAppStore();
  const [showShare, setShowShare] = useState(false);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  async function handleSave() {
    if (!currentProjectId) {
      toast.error("Aucun projet actif.");
      return;
    }
    try {
      setSaving(true);
      await saveProject(currentProjectId, project);
      toast.success("Projet sauvegardé ✅");
    } catch (err) {
      console.error("❌ Erreur sauvegarde:", err);
      toast.error("Erreur lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  }

  function handleDeploy() {
    if (!currentProjectId) {
      toast.error("Aucun projet actif.");
      return;
    }
    navigate(`/deploy/${currentProjectId}`);
  }

  function handleReplay() {
    if (!currentProjectId) {
      toast.error("Aucun projet actif.");
      return;
    }
    navigate(`/replay/${currentProjectId}`);
  }

  return (
    <div className="h-screen w-full flex flex-col">
      {/* Barre du haut */}
      <div className="p-4 flex justify-between items-center border-b bg-white dark:bg-slate-900">
        <h2 className="font-bold text-lg text-blue-600 dark:text-blue-400">
          ✨ UInova Éditeur
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1 px-4 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? "..." : "Sauvegarder"}
          </button>

          <button
            onClick={() => setShowShare(true)}
            className="flex items-center gap-1 px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Share2 className="w-4 h-4" /> Partager
          </button>

          <a
            href={`/export/${currentProjectId}/${currentPageId}`}
            target="_blank"
            className="flex items-center gap-1 px-4 py-1 bg-green-600 text-white rounded hover:bg-green-700"
            rel="noreferrer"
          >
            <Download className="w-4 h-4" /> Exporter
          </a>

          <button
            onClick={handleReplay}
            className="flex items-center gap-1 px-4 py-1 bg-orange-600 text-white rounded hover:bg-orange-700"
          >
            <Activity className="w-4 h-4" /> Replays
          </button>

          <button
            onClick={handleDeploy}
            className="flex items-center gap-1 px-4 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            <Play className="w-4 h-4" /> Déployer
          </button>
        </div>
      </div>

      {/* Zone d’édition */}
      <div className="flex-1 overflow-hidden bg-slate-50 dark:bg-slate-800">
        <LiveEditor />
      </div>

      {/* Modal Partage */}
      {showShare && <ShareModal onClose={() => setShowShare(false)} />}
    </div>
  );
}
