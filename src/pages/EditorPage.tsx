import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";
import ShareModal from "../components/ShareModal";
import LiveEditor, { DroppedComponent } from "../components/Editor/LiveEditor";
import ComponentPalette from "../components/Editor/ComponentPalette";
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
  Upload,
  Link as LinkIcon,
} from "lucide-react";
import { saveProject } from "@/services/projects";
import DashboardLayout from "@/layouts/DashboardLayout";

/* ===============================
   Editor Page – UInova v3.4
=============================== */
export default function EditorPage() {
  const { currentProjectId, currentPageId, project } = useAppStore();
  const [showShare, setShowShare] = useState(false);
  const [saving, setSaving] = useState(false);
  const [unsaved, setUnsaved] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiHistory, setAiHistory] = useState<string[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<DroppedComponent | null>(null);
  const navigate = useNavigate();

  /* ===============================
     Actions
  =============================== */
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

  function handleDeploy() {
    if (!currentProjectId) return toast.error("Aucun projet actif.");
    navigate(`/deploy/${currentProjectId}`);
  }

  function handleReplay() {
    if (!currentProjectId) return toast.error("Aucun projet actif.");
    navigate(`/replay/${currentProjectId}`);
  }

  function togglePreview() {
    setShowPreview((prev) => !prev);
  }

  function handleUndo() {
    toast("↩️ Annuler (à implémenter)");
  }
  function handleRedo() {
    toast("↪️ Refaire (à implémenter)");
  }

  function handleAISubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    toast.success(`🤖 Copilot a généré : ${aiPrompt}`);
    setAiHistory((prev) => [aiPrompt, ...prev].slice(0, 5));
    setAiPrompt("");
  }

  function handleUpdateComponent(id: string, props: Record<string, any>) {
    if (selectedComponent?.id === id) {
      setSelectedComponent({ ...selectedComponent, props });
      setUnsaved(true);
    }
  }

  // Upload image locale → Base64
  function handleImageUpload(file: File) {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (selectedComponent) {
        handleUpdateComponent(selectedComponent.id, {
          ...selectedComponent.props,
          src: reader.result,
        });
        toast.success("🖼️ Image importée");
      }
    };
    reader.readAsDataURL(file);
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
              <span className="text-xs text-orange-500 animate-pulse">
                ● Modifications non sauvegardées
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleUndo} className="flex items-center gap-1 px-3 py-1 bg-gray-200 dark:bg-slate-700 rounded hover:bg-gray-300">
              <RotateCcw className="w-4 h-4" /> Undo
            </button>
            <button onClick={handleRedo} className="flex items-center gap-1 px-3 py-1 bg-gray-200 dark:bg-slate-700 rounded hover:bg-gray-300">
              <RotateCw className="w-4 h-4" /> Redo
            </button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 px-4 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50">
              <Save className="w-4 h-4" />
              {saving ? "..." : "Sauvegarder"}
            </button>
            <button onClick={togglePreview} className="flex items-center gap-1 px-4 py-1 bg-gray-600 text-white rounded hover:bg-gray-700">
              <Eye className="w-4 h-4" /> {showPreview ? "Cacher" : "Preview"}
            </button>
            <button onClick={() => setShowShare(true)} className="flex items-center gap-1 px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
              <Share2 className="w-4 h-4" /> Partager
            </button>
            <a href={`/export/${currentProjectId}/${currentPageId}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-4 py-1 bg-green-600 text-white rounded hover:bg-green-700">
              <Download className="w-4 h-4" /> Exporter
            </a>
            <button onClick={handleReplay} className="flex items-center gap-1 px-4 py-1 bg-orange-600 text-white rounded hover:bg-orange-700">
              <Activity className="w-4 h-4" /> Replays
            </button>
            <button onClick={handleDeploy} className="flex items-center gap-1 px-4 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700">
              <Play className="w-4 h-4" /> Déployer
            </button>
            <div className="flex items-center gap-1 px-3 py-1 text-sm bg-slate-100 dark:bg-slate-800 rounded">
              <Users className="w-4 h-4 text-indigo-500" /> 2 en ligne
            </div>
          </div>
        </div>

        {/* ===== Zone principale ===== */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar gauche – Palette drag&drop */}
          <ComponentPalette />

          {/* Canvas central */}
          <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900">
            <LiveEditor
              onSelect={setSelectedComponent}
              onUpdateComponent={handleUpdateComponent}
            />
          </div>

          {/* Sidebar droite – Propriétés dynamiques */}
          <div className="w-80 border-l dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
            <h3 className="font-semibold mb-3">⚙️ Propriétés</h3>
            {selectedComponent ? (
              <div className="space-y-3 text-sm">
                <p>
                  Éditer : <strong>{selectedComponent.label}</strong>
                </p>

                {/* Texte */}
                {"text" in selectedComponent.props && (
                  <input
                    type="text"
                    placeholder="Texte..."
                    defaultValue={selectedComponent.props.text}
                    onBlur={(e) =>
                      handleUpdateComponent(selectedComponent.id, {
                        ...selectedComponent.props,
                        text: e.target.value,
                      })
                    }
                    className="w-full px-2 py-1 border rounded dark:bg-slate-800 dark:border-slate-700"
                  />
                )}

                {/* Couleur bouton */}
                {"color" in selectedComponent.props && (
                  <input
                    type="color"
                    defaultValue={selectedComponent.props.color}
                    onChange={(e) =>
                      handleUpdateComponent(selectedComponent.id, {
                        ...selectedComponent.props,
                        color: e.target.value,
                      })
                    }
                    className="w-12 h-8 border rounded"
                  />
                )}

                {/* Largeur image */}
                {"width" in selectedComponent.props && (
                  <input
                    type="range"
                    min={10}
                    max={100}
                    defaultValue={selectedComponent.props.width}
                    onChange={(e) =>
                      handleUpdateComponent(selectedComponent.id, {
                        ...selectedComponent.props,
                        width: Number(e.target.value),
                      })
                    }
                    className="w-full"
                  />
                )}

                {/* Source image */}
                {"src" in selectedComponent.props && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <LinkIcon className="w-4 h-4 text-gray-500" />
                      <input
                        type="text"
                        placeholder="URL de l'image"
                        defaultValue={selectedComponent.props.src}
                        onBlur={(e) =>
                          handleUpdateComponent(selectedComponent.id, {
                            ...selectedComponent.props,
                            src: e.target.value,
                          })
                        }
                        className="flex-1 px-2 py-1 border rounded dark:bg-slate-800 dark:border-slate-700"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-xs cursor-pointer text-blue-600 hover:underline">
                      <Upload className="w-4 h-4" />
                      Importer une image
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file);
                        }}
                      />
                    </label>
                  </div>
                )}

                {/* Texte bouton formulaire */}
                {"buttonText" in selectedComponent.props && (
                  <input
                    type="text"
                    placeholder="Texte bouton"
                    defaultValue={selectedComponent.props.buttonText}
                    onBlur={(e) =>
                      handleUpdateComponent(selectedComponent.id, {
                        ...selectedComponent.props,
                        buttonText: e.target.value,
                      })
                    }
                    className="w-full px-2 py-1 border rounded dark:bg-slate-800 dark:border-slate-700"
                  />
                )}
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
                <span
                  key={i}
                  className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded"
                >
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
