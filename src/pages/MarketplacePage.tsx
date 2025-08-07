import { useEffect, useState } from 'react';
import axios from 'axios';

export default function MarketplacePage() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    axios.get('http://localhost:5000/api/marketplace')
      .then(res => setItems(res.data))
      .catch(() => {});
  }, []);

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold mb-6">Marketplace</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {items.map(item =>
          <div key={item.id} className="bg-white shadow rounded p-4 flex flex-col">
            <span className="font-semibold">{item.title}</span>
            <span className="mb-2 text-gray-600">{item.type}</span>
            <span className="mb-2">{item.price} €</span>
            <button className="bg-blue-600 text-white px-2 py-1 rounded">Acheter</button>
          </div>
        )}
      </div>
    </div>
  );
}
