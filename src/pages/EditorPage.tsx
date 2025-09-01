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
  RotateCcw,
  RotateCw,
  Users,
} from "lucide-react";
import { saveProject } from "@/services/projects";
import DashboardLayout from "@/layouts/DashboardLayout";

/* ===============================
   Editor Page – UInova v2
=============================== */
export default function EditorPage() {
  const { currentProjectId, currentPageId, project } = useAppStore();
  const [showShare, setShowShare] = useState(false);
  const [saving, setSaving] = useState(false);
  const [unsaved, setUnsaved] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiHistory, setAiHistory] = useState<string[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<any>(null);
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
      setUnsaved(false);
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

  // Undo/Redo (placeholder)
  function handleUndo() {
    toast("↩️ Annuler (à implémenter)");
  }
  function handleRedo() {
    toast("↪️ Refaire (à implémenter)");
  }

  // Copilot IA
  function handleAISubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    toast.success(`🤖 Copilot a généré : ${aiPrompt}`);
    setAiHistory((prev) => [aiPrompt, ...prev].slice(0, 5));
    setAiPrompt("");
  }

  /* ===============================
     Render
  =============================== */
  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        {/* ===== Toolbar ===== */}
        <div className="p-3 flex justify-between items-center border-b bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-lg text-blue-600 dark:text-blue-400">
              ✨ UInova Éditeur
            </h2>
            {unsaved && (
              <span className="text-xs text-orange-500">● Modifications non sauvegardées</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleUndo}
              className="flex items-center gap-1 px-3 py-1 bg-gray-200 dark:bg-slate-700 rounded hover:bg-gray-300"
            >
              <RotateCcw className="w-4 h-4" /> Undo
            </button>
            <button
              onClick={handleRedo}
              className="flex items-center gap-1 px-3 py-1 bg-gray-200 dark:bg-slate-700 rounded hover:bg-gray-300"
            >
              <RotateCw className="w-4 h-4" /> Redo
            </button>
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
            <div className="flex items-center gap-1 px-3 py-1 text-sm bg-slate-100 dark:bg-slate-800 rounded">
              <Users className="w-4 h-4 text-indigo-500" /> 2 en ligne
            </div>
          </div>
        </div>

        {/* ===== Zone principale ===== */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar gauche – Composants */}
          <div className="w-60 border-r dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 space-y-2">
            <h3 className="font-semibold mb-2">📦 Composants</h3>
            {["Bouton", "Texte", "Image", "Formulaire"].map((c) => (
              <div
                key={c}
                className="p-2 rounded bg-white dark:bg-slate-700 shadow cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600"
                onClick={() => setSelectedComponent(c)}
              >
                {c}
              </div>
            ))}
          </div>

          {/* Canvas central */}
          <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900">
            <LiveEditor />
          </div>

          {/* Sidebar droite – Propriétés */}
          <div className="w-72 border-l dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
            <h3 className="font-semibold mb-2">⚙️ Propriétés</h3>
            {selectedComponent ? (
              <div className="space-y-2 text-sm">
                <p>Éditer les propriétés de : <strong>{selectedComponent}</strong></p>
                <input
                  type="text"
                  placeholder="Texte..."
                  className="w-full px-2 py-1 border rounded dark:bg-slate-800 dark:border-slate-700"
                />
                <button className="px-3 py-1 bg-blue-600 text-white rounded text-xs">
                  Appliquer
                </button>
              </div>
            ) : (
              <p className="text-gray-400 text-sm">Sélectionnez un composant</p>
            )}
          </div>
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
          {aiHistory.length > 0 && (
            <div className="ml-4 text-xs text-gray-500 flex gap-2">
              {aiHistory.map((h, i) => (
                <span key={i} className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded">
                  {h}
                </span>
              ))}
            </div>
          )}
        </form>

        {/* ===== Modal Partage ===== */}
        {showShare && <ShareModal onClose={() => setShowShare(false)} />}
      </div>
    </DashboardLayout>
  );
}
