// src/pages/PreviewPage.tsx
import { useParams, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import LivePreview from "../components/Editor/LivePreview";
import { toast } from "react-hot-toast";
import {
  Maximize2,
  Smartphone,
  Monitor,
  Rotate3D,
  Copy,
  Link as LinkIcon,
} from "lucide-react";

/* ===============================
   Preview Page – UInova
=============================== */
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

  if (!project) {
    return (
      <div className="p-8 text-center text-gray-500">
        🚫 Projet introuvable ou non accessible
      </div>
    );
  }

  if (!page) {
    return (
      <div className="p-8 text-center text-gray-500">
        🚫 Page introuvable ou non accessible
      </div>
    );
  }

  // Copier le lien public
  function copyPublicLink() {
    const link = `${window.location.origin}/preview/${projectId}/${pageId}?token=${
      token || "PUBLIC"
    }`;
    navigator.clipboard.writeText(link);
    toast.success("🔗 Lien copié dans le presse-papiers !");
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-900">
      {/* ===== Header Preview ===== */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-2 border-b bg-slate-100 dark:bg-slate-800 shadow-sm">
        <div>
          <h1 className="text-lg font-bold text-blue-600 dark:text-blue-400">
            👁️ Preview – {project.name} / {page.name}
          </h1>
          <p className="text-xs text-gray-500">
            {token ? "Lien public avec token 🔓" : "Preview privée 🔒"}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setMode("desktop")}
            aria-label="Mode Desktop"
            className={`p-2 rounded ${
              mode === "desktop"
                ? "bg-blue-600 text-white"
                : "bg-slate-200 dark:bg-slate-700"
            }`}
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMode("mobile")}
            aria-label="Mode Mobile"
            className={`p-2 rounded ${
              mode === "mobile"
                ? "bg-blue-600 text-white"
                : "bg-slate-200 dark:bg-slate-700"
            }`}
          >
            <Smartphone className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMode("fullscreen")}
            aria-label="Mode Plein écran"
            className={`p-2 rounded ${
              mode === "fullscreen"
                ? "bg-blue-600 text-white"
                : "bg-slate-200 dark:bg-slate-700"
            }`}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMode("ar")}
            aria-label="Mode AR/3D"
            className={`p-2 rounded ${
              mode === "ar"
                ? "bg-blue-600 text-white"
                : "bg-slate-200 dark:bg-slate-700"
            }`}
          >
            <Rotate3D className="w-4 h-4" />
          </button>
          <button
            onClick={copyPublicLink}
            aria-label="Copier le lien public"
            className="p-2 rounded bg-purple-600 text-white hover:bg-purple-700"
          >
            <LinkIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ===== Zone Preview ===== */}
      <div className="flex-1 flex justify-center items-center bg-slate-50 dark:bg-slate-900">
        <div
          className={`transition-all duration-300 ${
            mode === "mobile"
              ? "w-[375px] border rounded-xl shadow bg-white dark:bg-slate-800"
              : mode === "fullscreen"
              ? "w-full h-full"
              : "w-full max-w-5xl"
          }`}
        >
          {mode === "ar" ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Rotate3D className="w-8 h-8 mb-2 text-blue-500 animate-pulse" />
              🚀 Mode AR/3D immersif – bientôt disponible
            </div>
          ) : (
            <LivePreview elements={page.elements} />
          )}
        </div>
      </div>
    </div>
  );
}
