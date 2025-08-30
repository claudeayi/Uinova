import { useEffect, useState } from "react";
import { getMarketplaceItems } from "@/services/marketplace";

export default function MarketplaceList() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    getMarketplaceItems().then(setItems);
  }, []);

  return (
    <div className="grid grid-cols-3 gap-4">
      {items.map((item) => (
        <div key={item.id} className="p-4 bg-gray-800 rounded-lg">
          <h3 className="text-white font-bold">{item.title}</h3>
          <p className="text-gray-400">{item.description}</p>
          <p className="mt-2">{item.price ? `${item.price} €` : "Gratuit"}</p>
        </div>
      ))}
    </div>
  );
}
