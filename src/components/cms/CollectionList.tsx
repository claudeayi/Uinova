// src/components/cms/CollectionList.tsx
import { ReactNode } from "react";
import { useCMS } from "../../store/useCMS";
import { Loader2 } from "lucide-react";

type RenderItem = (item: Record<string, any>, index: number) => ReactNode;

interface CollectionListProps {
  collectionId: string;
  limit?: number;
  renderItem: RenderItem;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export default function CollectionList({
  collectionId,
  limit = Infinity,
  renderItem,
  loading = false,
  emptyMessage = "Aucun élément trouvé",
  className,
}: CollectionListProps) {
  const { getItems } = useCMS();

  let items: Record<string, any>[] = [];
  try {
    items = getItems(collectionId) || [];
  } catch (e) {
    console.error("❌ Erreur récupération collection:", e);
    items = [];
  }

  const limited = items.slice(0, limit);

  if (loading) {
    return (
      <div
        className="flex items-center justify-center p-6 text-gray-500 dark:text-gray-400"
        aria-busy="true"
      >
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Chargement...
      </div>
    );
  }

  if (!limited.length) {
    return (
      <div
        className="p-6 text-center text-gray-500 dark:text-gray-400 italic"
        role="status"
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div role="list" className={className}>
      {limited.map((it, i) => (
        <div key={i} role="listitem" className="mb-2 last:mb-0">
          {renderItem(it, i)}
        </div>
      ))}
    </div>
  );
}
