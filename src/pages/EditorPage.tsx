// src/pages/EditorPage.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";
import ShareModal from "../components/ShareModal";
import LiveEditor from "../components/Editor/LiveEditor";
import { toast } from "react-hot-toast";
import {
  Play,
  Save,
  Share2,
  Download,
  Activity,
  Eye,
  Bot,
} from "lucide-react";
import { saveProject } from "@/services/projects";
import DashboardLayout from "@/layouts/DashboardLayout";

/* ===============================
   Editor Page – UInova
=============================== */
export default function EditorPage() {
  const { currentProjectId, currentPageId, project } = useAppStore();
  const [showShare, setShowShare] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const navigate = useNavigate();

  // Sauvegarde projet
  async function handleSave() {
    if (!currentProjectId) {
      toast.error("❌ Aucun projet actif.");
      return;
    }
    try {
      setSaving(true);
      await saveProject(currentProjectId, project);
      toast.success("💾 Projet sauvegardé ✅");
    } catch (err) {
      console.error("❌ Erreur sauvegarde:", err);
      toast.error("Erreur lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  }

  // Déploiement
  function handleDeploy() {
    if (!currentProjectId) return toast.error("Aucun projet actif.");
    navigate(`/deploy/${currentProjectId}`);
  }

  // Replays collaboratifs
  function handleReplay() {
    if (!currentProjectId) return toast.error("Aucun projet actif.");
    navigate(`/replay/${currentProjectId}`);
  }

  // Preview toggle
  function togglePreview() {
    setShowPreview((prev) => !prev);
  }

  // Copilot IA (mock)
  function handleAISubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    toast.success(`🤖 Copilot a généré : ${aiPrompt}`);
    setAiPrompt("");
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        {/* ===== Barre du haut ===== */}
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
              <Save className="w-4 h-4" />
              {saving ? "..." : "Sauvegarder"}
            </button>

            <button
              onClick={togglePreview}
              className="flex items-center gap-1 px-4 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              <Eye className="w-4 h-4" /> {showPreview ? "Cacher" : "Preview"}
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
              rel="noreferrer"
              className="flex items-center gap-1 px-4 py-1 bg-green-600 text-white rounded hover:bg-green-700"
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

        {/* ===== Zone d’édition ===== */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 overflow-hidden">
          {/* Éditeur live */}
          <div className="overflow-auto bg-slate-50 dark:bg-slate-800">
            <LiveEditor />
          </div>

          {/* Preview live (optionnelle) */}
          {showPreview && (
            <div className="overflow-auto border-l dark:border-slate-700 bg-white dark:bg-slate-900">
              <iframe
                src={`/preview/${currentProjectId}/live`}
                title="Live Preview"
                className="w-full h-full"
              />
            </div>
          )}
        </div>

        {/* ===== Copilot IA ===== */}
        <form
          onSubmit={handleAISubmit}
          className="p-3 border-t bg-white dark:bg-slate-900 flex items-center gap-2"
        >
          <Bot className="w-5 h-5 text-indigo-500" />
          <input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Décrivez une interface à générer..."
            className="flex-1 px-3 py-2 rounded border dark:bg-slate-800 dark:border-slate-700 text-sm"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
          >
            Générer
          </button>
        </form>

        {/* ===== Modal Partage ===== */}
        {showShare && <ShareModal onClose={() => setShowShare(false)} />}
      </div>
    </DashboardLayout>
  );
}
