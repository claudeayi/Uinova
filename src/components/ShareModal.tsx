import { useAppStore } from "../store/useAppStore";

export default function ShareModal({ onClose }: { onClose: () => void }) {
  const { currentProjectId, currentPageId } = useAppStore();
  const url = `${window.location.origin}/preview/${currentProjectId}/${currentPageId}?token=demo`;

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    alert("Lien copié !");
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-lg w-[400px]">
        <h3 className="text-lg font-semibold mb-3">Partager l'aperçu</h3>
        <input
          readOnly
          className="w-full px-3 py-2 border rounded mb-3 text-sm"
          value={url}
        />
        <div className="flex justify-end space-x-2">
          <button
            onClick={copy}
            className="bg-blue-600 text-white px-4 py-1 rounded"
          >
            Copier
          </button>
          <button
            onClick={onClose}
            className="bg-gray-300 px-4 py-1 rounded"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
