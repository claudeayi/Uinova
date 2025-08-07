import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';

export default function Navbar() {
  const { user, role } = useAppStore();
  return (
    <nav className="bg-white shadow-md py-4 px-8 flex justify-between items-center">
      <Link to="/" className="font-bold text-lg text-blue-600">UInova</Link>
      <div className="space-x-4">
        <Link to="/" className="text-gray-700 hover:text-blue-600">Dashboard</Link>
        <Link to="/marketplace" className="text-gray-700 hover:text-blue-600">Marketplace</Link>
        <Link to="/editor/1" className="text-gray-700 hover:text-blue-600">Editor</Link>
        <Link to="/pricing" className="text-gray-700 hover:text-blue-600">Abonnement</Link>
        {role === 'premium' && <span className="bg-blue-600 text-white px-2 py-1 rounded">PRO</span>}
      </div>
    </nav>
  );
}
