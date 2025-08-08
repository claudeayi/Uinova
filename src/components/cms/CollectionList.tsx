import { ReactNode } from "react";
import { useCMS } from "../../store/useCMS";

type RenderItem = (item: Record<string, any>, index: number) => ReactNode;

export default function CollectionList({
  collectionId,
  limit,
  renderItem
}: {
  collectionId: string;
  limit?: number;
  renderItem: RenderItem;
}) {
  const { getItems } = useCMS();
  const items = getItems(collectionId).slice(0, limit || 999);
  return <>{items.map((it, i) => renderItem(it, i))}</>;
}
