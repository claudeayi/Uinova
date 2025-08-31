// src/pages/PreviewPage.tsx
import { useParams, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import LivePreview from "../components/Editor/LivePreview";
import { toast } from "react-hot-toast";
import { Maximize2, Smartphone, Monitor, Rotate3D } from "lucide-react";

export default function PreviewPage() {
  const { projectId, pageId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const {
    projects,
    setCurrentProjectId,
    setCurrentPageId,
    listenElements,
  } = useAppStore();

  const [mode, setMode] = useState<"desktop" | "mobile" | "fullscreen" | "ar">(
    "desktop"
  );

  useEffect(() => {
    if (!token) {
      console.warn("⚠️ Accès sans token – mode preview privé");
      toast("Accès sans token, preview limité");
    }
    if (projectId && pageId) {
      setCurrentProjectId(projectId);
      setCurrentPageId(pageId);
      listenElements();
    }
  }, [projectId, pageId, token]);

  const project = projects.find((p) => p.id === projectId);
  const page = project?.pages.find((p) => p.id === pageId);

  if (!page) {
    return (
      <div className="p-8 text-center text-gray-500">
        🚫 Page introuvable ou non accessible
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-900">
      {/* Header Preview */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-slate-100 dark:bg-slate-800">
        <h1 className="text-lg font-bold text-blue-600 dark:text-blue-400">
          👁️ Preview – {project?.name} / {page.name}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setMode("desktop")}
            className={`p-2 rounded ${
              mode === "desktop" ? "bg-blue-600 text-white" : "bg-slate-200"
            }`}
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMode("mobile")}
            className={`p-2 rounded ${
              mode === "mobile" ? "bg-blue-600 text-white" : "bg-slate-200"
            }`}
          >
            <Smartphone className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMode("fullscreen")}
            className={`p-2 rounded ${
              mode === "fullscreen" ? "bg-blue-600 text-white" : "bg-slate-200"
            }`}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMode("ar")}
            className={`p-2 rounded ${
              mode === "ar" ? "bg-blue-600 text-white" : "bg-slate-200"
            }`}
          >
            <Rotate3D className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Zone Preview */}
      <div className="flex-1 flex justify-center items-center bg-slate-50 dark:bg-slate-900">
        <div
          className={`${
            mode === "mobile"
              ? "w-[375px] border rounded-xl shadow bg-white dark:bg-slate-800"
              : mode === "fullscreen"
              ? "w-full h-full"
              : "w-full max-w-5xl"
          } transition-all duration-300`}
        >
          {mode === "ar" ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              🚀 Mode AR/3D – bientôt disponible
            </div>
          ) : (
            <LivePreview elements={page.elements} />
          )}
        </div>
      </div>
    </div>
  );
}
