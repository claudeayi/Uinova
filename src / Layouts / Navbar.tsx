import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

function DarkModeToggle() {
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <button
      onClick={() => setDark((d) => !d)}
      className="ml-2 px-2 py-1 rounded border bg-gray-100 dark:bg-gray-700"
      title="Activer/Désactiver le mode sombre"
    >
      {dark ? "🌙" : "☀️"}
    </button>
  );
}

export default function Navbar() {
  return (
    <nav className="flex items-center justify-between px-6 py-3 bg-white dark:bg-gray-900 border-b dark:border-gray-700">
      <div className="flex items-center gap-4">
        <Link to="/" className="text-2xl font-bold text-blue-700 dark:text-blue-300">UInova</Link>
        {/* Ajoute d'autres liens ici si besoin */}
        <Link to="/marketplace" className="text-sm text-gray-700 dark:text-gray-300 hover:underline">Marketplace</Link>
        <Link to="/pricing" className="text-sm text-gray-700 dark:text-gray-300 hover:underline">Pricing</Link>
      </div>
      <div className="flex items-center gap-2">
        {/* Liens utilisateur/connexion ici si besoin */}
        <Link to="/login" className="text-sm text-gray-700 dark:text-gray-300 hover:underline">Connexion</Link>
        <Link to="/register" className="text-sm text-gray-700 dark:text-gray-300 hover:underline">Inscription</Link>
        {/* Switch dark mode */}
        <DarkModeToggle />
      </div>
    </nav>
  );
}
