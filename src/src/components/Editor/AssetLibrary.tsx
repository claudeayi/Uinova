import { useState } from "react";
import { Upload, Search } from "lucide-react";
import { toast } from "react-hot-toast";

interface AssetLibraryProps {
  onSelect: (src: string) => void;
}

const DEFAULT_ASSETS = [
  "https://via.placeholder.com/150",
  "https://picsum.photos/200/300",
  "https://picsum.photos/300/200",
  "https://picsum.photos/400/200",
];

export default function AssetLibrary({ onSelect }: AssetLibraryProps) {
  const [assets, setAssets] = useState<string[]>(DEFAULT_ASSETS);
  const [search, setSearch] = useState("");

  // Upload image locale → base64
  function handleUpload(file: File) {
    const reader = new FileReader();
    reader.onloadend = () => {
      setAssets((prev) => [reader.result as string, ...prev]);
      toast.success("🖼️ Image ajoutée à la bibliothèque");
    };
    reader.readAsDataURL(file);
  }

  const filtered = assets.filter((src) =>
    src.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <aside className="w-80 border-l dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4 flex flex-col">
      <h3 className="font-semibold mb-3 text-blue-600 dark:text-blue-400">
        📚 Bibliothèque d’assets
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

      {/* Liste des assets */}
      <div className="grid grid-cols-2 gap-3 overflow-y-auto flex-1">
        {filtered.map((src, idx) => (
          <img
            key={idx}
            src={src}
            alt="asset"
            className="w-full h-24 object-cover rounded cursor-pointer hover:ring-2 hover:ring-indigo-500 transition"
            onClick={() => onSelect(src)}
          />
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
