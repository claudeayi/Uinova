// src/components/Editor/AssetLibrary.tsx
import { useState } from "react";
import { Upload, Search, Image as ImageIcon, FolderUp } from "lucide-react";
import { toast } from "react-hot-toast";

interface AssetLibraryProps {
  onSelect: (src: string) => void;
  onHover?: (src: string | null) => void; // ✅ callback hover pour preview temporaire
}

const DEFAULT_ASSETS = [
  "https://via.placeholder.com/150",
  "https://picsum.photos/200/300",
  "https://picsum.photos/300/200",
  "https://picsum.photos/400/200",
];

/* ============================================================================
 * AssetLibrary – Bibliothèque d’images enrichie
 * ========================================================================= */
export default function AssetLibrary({ onSelect, onHover }: AssetLibraryProps) {
  const [assets, setAssets] = useState<string[]>(DEFAULT_ASSETS);
  const [search, setSearch] = useState("");
  const [dragOver, setDragOver] = useState(false);

  // Upload image locale → base64
  function handleUpload(file: File) {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("❌ Image trop lourde (max 5 Mo).");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const src = reader.result as string;
      if (assets.includes(src)) {
        toast("⚠️ Cette image est déjà dans la bibliothèque");
        return;
      }
      setAssets((prev) => [src, ...prev]);
      toast.success(`🖼️ ${file.name} ajoutée (${Math.round(file.size / 1024)} Ko)`);
    };
    reader.readAsDataURL(file);
  }

  // Drag & drop
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  // Filtre recherche
  const filtered = assets.filter((src) =>
    src.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <aside
      className={`w-80 border-l dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4 flex flex-col transition ${
        dragOver ? "ring-2 ring-indigo-400" : ""
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Titre */}
      <h3 className="font-semibold mb-3 text-blue-600 dark:text-blue-400 flex items-center gap-2 justify-between">
        <span className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4" /> Bibliothèque d’assets
        </span>
        <span className="text-xs text-gray-500">{assets.length} items</span>
      </h3>

      {/* Recherche */}
      <div className="flex items-center gap-2 mb-3">
        <Search className="w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="Rechercher une image..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-2 py-1 border rounded text-sm dark:bg-slate-800 dark:border-slate-700"
        />
      </div>

      {/* Upload */}
      <label className="flex items-center gap-2 text-sm cursor-pointer text-blue-600 hover:underline mb-4">
        <Upload className="w-4 h-4" />
        Importer une image
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
          }}
        />
      </label>

      {/* Drag & drop helper */}
      {dragOver && (
        <div className="flex items-center justify-center text-indigo-500 text-sm mb-2">
          <FolderUp className="w-4 h-4 mr-1" /> Déposez l’image ici...
        </div>
      )}

      {/* Liste des assets */}
      <div className="grid grid-cols-2 gap-3 overflow-y-auto flex-1 pr-1">
        {filtered.map((src, idx) => (
          <img
            key={idx}
            src={src}
            alt="asset"
            className="w-full h-24 object-cover rounded cursor-pointer hover:ring-2 hover:ring-indigo-500 transition"
            onClick={() => {
              onSelect(src);
              toast.success("✅ Image sélectionnée");
            }}
            onMouseEnter={() => onHover?.(src)}
            onMouseLeave={() => onHover?.(null)}
          />
        ))}

        {/* Aucun résultat */}
        {filtered.length === 0 && (
          <p className="text-gray-400 col-span-2 text-center text-sm">
            Aucun résultat
          </p>
        )}
      </div>
    </aside>
  );
}
