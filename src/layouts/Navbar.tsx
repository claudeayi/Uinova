import { useState, useEffect } from "react";
import { Link, NavLink } from "react-router-dom";
import { useProject } from "@/context/ProjectContext";
import { useAuth } from "@/hooks/useAuth";
import ProjectSelector from "@/components/projects/ProjectSelector";

export default function Navbar() {
  const [dark, setDark] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false); // ⚡ mobile
  const { projectId } = useProject();
  const { user, logout } = useAuth();

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
        {/* Logo */}
        <Link
          to="/"
          className="text-xl font-bold text-blue-600 dark:text-blue-400"
        >
          UInova
        </Link>

        {/* Menu desktop */}
        <div className="hidden md:flex items-center space-x-4">
          <NavLink to="/" className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ""}`}>
            Dashboard
          </NavLink>

          <NavLink to="/projects" className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ""}`}>
            Projets
          </NavLink>

          <NavLink to="/marketplace" className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ""}`}>
            Marketplace
          </NavLink>

          {/* ⚙️ Admin seulement */}
          {user?.role === "admin" && (
            <>
              <NavLink to="/marketplace/manage" className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ""}`}>
                ⚙️ Gestion Marketplace
              </NavLink>
              <NavLink to="/admin" className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ""}`}>
                🛠️ Admin Panel
              </NavLink>
            </>
          )}

          <NavLink to="/pricing" className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ""}`}>
            Tarifs
          </NavLink>

          <NavLink to="/payment" className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ""}`}>
            Paiement
          </NavLink>

          {/* Phase 3 */}
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

        {/* Zone droite */}
        <div className="hidden md:flex items-center space-x-3">
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
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                👋 {user.email}
              </span>
              <button
                onClick={logout}
                className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Déconnexion
              </button>
            </div>
          )}

          {/* Dark mode toggle */}
          <button
            onClick={() => setDark(!dark)}
            className="px-3 py-2 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition"
          >
            {dark ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>

        {/* Burger menu mobile */}
        <button
          className="md:hidden px-3 py-2 rounded bg-slate-200 dark:bg-slate-700"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? "✖️" : "☰"}
        </button>
      </div>

      {/* Menu mobile */}
      {menuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-700 p-4 space-y-2 bg-white dark:bg-slate-900">
          <NavLink to="/" onClick={() => setMenuOpen(false)} className={linkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/projects" onClick={() => setMenuOpen(false)} className={linkClass}>
            Projets
          </NavLink>
          <NavLink to="/marketplace" onClick={() => setMenuOpen(false)} className={linkClass}>
            Marketplace
          </NavLink>
          {user?.role === "admin" && (
            <>
              <NavLink to="/marketplace/manage" onClick={() => setMenuOpen(false)} className={linkClass}>
                ⚙️ Gestion Marketplace
              </NavLink>
              <NavLink to="/admin" onClick={() => setMenuOpen(false)} className={linkClass}>
                🛠️ Admin Panel
              </NavLink>
            </>
          )}
          <NavLink to="/pricing" onClick={() => setMenuOpen(false)} className={linkClass}>
            Tarifs
          </NavLink>
          <NavLink to="/payment" onClick={() => setMenuOpen(false)} className={linkClass}>
            Paiement
          </NavLink>
          <NavLink to="/monitoring" onClick={() => setMenuOpen(false)} className={linkClass}>
            Monitoring
          </NavLink>
          {!user ? (
            <>
              <NavLink to="/login" onClick={() => setMenuOpen(false)} className={linkClass}>
                Connexion
              </NavLink>
              <NavLink to="/register" onClick={() => setMenuOpen(false)} className={linkClass}>
                Inscription
              </NavLink>
            </>
          ) : (
            <button
              onClick={() => {
                logout();
                setMenuOpen(false);
              }}
              className="w-full text-left text-red-600"
            >
              Déconnexion
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
