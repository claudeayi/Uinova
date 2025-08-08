import { useAppStore } from "../store/useAppStore";
import ShareModal from "../components/ShareModal";
import { useState } from "react";
import LiveEditor from "../components/Editor/LiveEditor";

export default function EditorPage() {
  const { currentProjectId, currentPageId } = useAppStore();
  const [showShare, setShowShare] = useState(false);

  return (
    <div className="h-screen w-full flex flex-col">
      <div className="p-4 flex justify-between items-center border-b bg-white">
        <h2 className="font-bold text-lg">Éditeur UInova</h2>
        <div className="space-x-2">
          <button
            onClick={() => setShowShare(true)}
            className="px-4 py-1 bg-blue-600 text-white rounded"
          >
            🔗 Partager
          </button>
          <a
            href={`/export/${currentProjectId}/${currentPageId}`}
            target="_blank"
            className="px-4 py-1 bg-green-600 text-white rounded"
            rel="noreferrer"
          >
            ⬇️ Exporter
          </a>
        </div>
      </div>
      <LiveEditor />
      {showShare && <ShareModal onClose={() => setShowShare(false)} />}
    </div>
  );
}
