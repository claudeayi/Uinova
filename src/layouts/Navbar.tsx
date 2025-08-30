import { useState, useEffect } from "react";
import { Link, NavLink } from "react-router-dom";
import { useProject } from "@/context/ProjectContext";
import { useAuth } from "@/hooks/useAuth"; // ⚡ pour récupérer user connecté
import ProjectSelector from "@/components/projects/ProjectSelector";

export default function Navbar() {
  const [dark, setDark] = useState(false);
  const { projectId } = useProject();
  const { user } = useAuth(); // ⚡ user = { id, email, role }

  useEffect(() => {
    document.body.className = dark ? "dark" : "";
  }, [dark]);

  const linkClass =
    "px-3 py-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition";
  const activeClass =
    "bg-slate-300 dark:bg-slate-800 font-semibold text-blue-600 dark:text-blue-400";
  const disabledClass =
    "px-3 py-2 rounded text-gray-400 cursor-not-allowed";

  return (
    <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="container mx-auto flex items-center justify-between py-3">
        {/* Logo / Accueil */}
        <Link
          to="/"
          className="text-xl font-bold text-blue-600 dark:text-blue-400"
        >
          UInova
        </Link>

        {/* Menu navigation */}
        <div className="flex items-center space-x-4">
          <NavLink to="/" className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ""}`}>
            Dashboard
          </NavLink>

          <NavLink to="/projects" className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ""}`}>
            Projets
          </NavLink>

          <NavLink to="/marketplace" className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ""}`}>
            Marketplace
          </NavLink>

          {/* ⚙️ Gestion Marketplace → visible uniquement pour admin */}
          {user?.role === "admin" && (
            <NavLink
              to="/marketplace/manage"
              className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ""}`}
            >
              ⚙️ Gestion Marketplace
            </NavLink>
          )}

          <NavLink to="/pricing" className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ""}`}>
            Tarifs
          </NavLink>

          <NavLink to="/payment" className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ""}`}>
            Paiement
          </NavLink>

          {/* ⚡ Nouvelles fonctionnalités Phase 3 */}
          {projectId ? (
            <>
              <NavLink to={`/deploy/${projectId}`} className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ""}`}>
                Deploy
              </NavLink>
              <NavLink to={`/replay/${projectId}`} className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ""}`}>
                Replay
              </NavLink>
              <NavLink to={`/ar/${projectId}`} className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ""}`}>
                AR/VR
              </NavLink>
            </>
          ) : (
            <>
              <span className={disabledClass}>Deploy</span>
              <span className={disabledClass}>Replay</span>
              <span className={disabledClass}>AR/VR</span>
            </>
          )}

          <NavLink to="/monitoring" className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ""}`}>
            Monitoring
          </NavLink>
        </div>

        {/* Zone droite : Sélecteur projet + Auth + Dark/Light */}
        <div className="flex items-center space-x-3">
          <ProjectSelector />

          {!user ? (
            <>
              <NavLink to="/login" className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ""}`}>
                Connexion
              </NavLink>
              <NavLink to="/register" className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ""}`}>
                Inscription
              </NavLink>
            </>
          ) : (
            <span className="text-sm text-gray-600 dark:text-gray-300">
              👋 {user.email}
            </span>
          )}

          {/* Bouton Dark/Light */}
          <button
            onClick={() => setDark(!dark)}
            className="px-3 py-2 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition"
          >
            {dark ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>
      </div>
    </nav>
  );
}
