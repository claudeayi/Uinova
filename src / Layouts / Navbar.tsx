import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { useState, useEffect } from "react";

export default function Navbar() {
  const { user, role } = useAppStore();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-md py-4 px-8 flex justify-between items-center">
      <Link to="/" className="font-bold text-lg text-blue-600 dark:text-white">UInova</Link>
      <div className="space-x-4 flex items-center">
        <Link to="/" className="text-gray-700 dark:text-gray-200 hover:text-blue-600">Dashboard</Link>
        <Link to="/marketplace" className="text-gray-700 dark:text-gray-200 hover:text-blue-600">Marketplace</Link>
        <Link to="/editor/1" className="text-gray-700 dark:text-gray-200 hover:text-blue-600">Editor</Link>
        <Link to="/pricing" className="text-gray-700 dark:text-gray-200 hover:text-blue-600">Abonnement</Link>
        {role === 'premium' && <span className="bg-blue-600 text-white px-2 py-1 rounded">PRO</span>}
        <button onClick={() => setDark(d => !d)} className="ml-6 text-2xl">
          {dark ? "🌙" : "☀️"}
        </button>
      </div>
    </nav>
  );
}
