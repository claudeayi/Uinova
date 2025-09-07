// src/components/Editor/AssetLibrary.tsx
import { useState } from "react";
import {
  Upload,
  Search,
  Image as ImageIcon,
  FolderUp,
  SortDesc,
} from "lucide-react";
import { toast } from "react-hot-toast";

interface AssetLibraryProps {
  onSelect: (src: string) => void;
  onHover?: (src: string | null) => void; // ✅ callback hover pour preview temporaire
}

type Asset = {
  src: string;
  name: string;
  size: number;
  addedAt: number;
};

const DEFAULT_ASSETS: Asset[] = [
  { src: "https://via.placeholder.com/150", name: "Placeholder 150", size: 0, addedAt: Date.now() },
  { src: "https://picsum.photos/200/300", name: "Picsum 200x300", size: 0, addedAt: Date.now() },
  { src: "https://picsum.photos/300/200", name: "Picsum 300x200", size: 0, addedAt: Date.now() },
  { src: "https://picsum.photos/400/200", name: "Picsum 400x200", size: 0, addedAt: Date.now() },
];

/* ============================================================================
 * AssetLibrary – Bibliothèque d’images enrichie
 * ========================================================================= */
export default function AssetLibrary({ onSelect, onHover }: AssetLibraryProps) {
  const [assets, setAssets] = useState<Asset[]>(DEFAULT_ASSETS);
  const [search, setSearch] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [sortDesc, setSortDesc] = useState(true);

  // Upload image locale → base64
  function handleUpload(file: File) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("❌ Seules les images sont autorisées.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("❌ Image trop lourde (max 5 Mo).");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const src = reader.result as string;
      if (assets.some((a) => a.src === src)) {
        toast("⚠️ Cette image est déjà dans la bibliothèque");
        return;
      }
      const newAsset: Asset = {
        src,
        name: file.name,
        size: file.size,
        addedAt: Date.now(),
      };
      setAssets((prev) => [newAsset, ...prev]);
      toast.success(`🖼️ ${file.name} ajoutée (${Math.round(file.size / 1024)} Ko)`);
    };
    reader.readAsDataURL(file);
  }

  // Multi-upload
  function handleMultiUpload(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach((file) => handleUpload(file));
  }

  // Drag & drop
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    handleMultiUpload(e.dataTransfer.files);
  }
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }
  function handleDragLeave() {
    setDragOver(false);
  }

  // Filtre + tri
  const filtered = assets
    .filter((a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.src.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) =>
      sortDesc ? b.addedAt - a.addedAt : a.addedAt - b.addedAt
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
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-2">
          <ImageIcon className="w-4 h-4" /> Bibliothèque d’assets
        </h3>
        <button
          onClick={() => setSortDesc((s) => !s)}
          className="text-xs flex items-center gap-1 text-gray-600 dark:text-gray-300 hover:text-indigo-500"
          title="Changer l’ordre"
        >
          <SortDesc className="w-4 h-4" /> {sortDesc ? "Récent" : "Ancien"}
        </button>
      </div>

      {/* Recherche */}
      <div className="flex items-center gap-2 mb-3">
        <Search className="w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="Rechercher une image..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-2 py-1 border rounded text-sm dark:bg-slate-800 dark:border-slate-700"
          aria-label="Recherche d’image"
        />
      </div>

      {/* Upload */}
      <label className="flex items-center gap-2 text-sm cursor-pointer text-blue-600 hover:underline mb-4">
        <Upload className="w-4 h-4" />
        Importer des images
        <input
          type="file"
          accept="image/*"
          className="hidden"
          multiple
          onChange={(e) => handleMultiUpload(e.target.files)}
        />
      </label>

      {/* Drag & drop helper */}
      {dragOver && (
        <div className="flex items-center justify-center text-indigo-500 text-sm mb-2">
          <FolderUp className="w-4 h-4 mr-1" /> Déposez les images ici...
        </div>
      )}

      {/* Liste */}
      <div className="grid grid-cols-2 gap-3 overflow-y-auto flex-1 pr-1">
        {filtered.map((asset, idx) => (
          <div key={idx} className="relative group">
            <img
              src={asset.src}
              alt={asset.name}
              className="w-full h-24 object-cover rounded cursor-pointer hover:ring-2 hover:ring-indigo-500 transition"
              onClick={() => {
                onSelect(asset.src);
                toast.success("✅ Image sélectionnée");
              }}
              onMouseEnter={() => onHover?.(asset.src)}
              onMouseLeave={() => onHover?.(null)}
            />
            <span className="absolute bottom-1 left-1 text-[10px] bg-black/50 text-white px-1 rounded opacity-0 group-hover:opacity-100 transition">
              {asset.name}
            </span>
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="text-gray-400 col-span-2 text-center text-sm">
            Aucun résultat
          </p>
        )}
      </div>
    </aside>
  );
}
