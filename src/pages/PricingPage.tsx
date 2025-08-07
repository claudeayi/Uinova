import { useNavigate } from 'react-router-dom';

export default function PricingPage() {
  const navigate = useNavigate();
  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold mb-6">Choisissez un plan</h1>
      <div className="flex space-x-6">
        <div className="border p-6 rounded-lg w-1/2">
          <h2 className="text-xl font-bold mb-2">Freemium</h2>
          <p>Accès de base aux fonctionnalités de l’éditeur.</p>
        </div>
        <div className="border p-6 rounded-lg w-1/2">
          <h2 className="text-xl font-bold mb-2">Premium</h2>
          <p>Accès complet + assistant IA + export HTML/Flutter + Marketplace</p>
          <button
            className="bg-green-600 text-white px-4 py-2 rounded mt-4"
            onClick={() => navigate('/payment')}
          >
            Passer à Premium
          </button>
        </div>
      </div>
    </div>
  );
}
