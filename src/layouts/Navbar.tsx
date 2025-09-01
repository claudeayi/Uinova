import { useState, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useProject } from "@/context/ProjectContext";
import { useAuth } from "@/hooks/useAuth";
import ProjectSelector from "@/components/projects/ProjectSelector";
import GlobalSearch from "@/components/global/GlobalSearch"; // 🚀 Nouveau composant global

export default function Navbar() {
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");
  const [menuOpen, setMenuOpen] = useState(false);
  const { projectId } = useProject();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.body.className = dark ? "dark" : "";
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  const linkClass =
    "relative px-3 py-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition";
  const activeClass =
    "bg-slate-300 dark:bg-slate-800 font-semibold text-blue-600 dark:text-blue-400";
  const disabledClass =
    "px-3 py-2 rounded text-gray-400 cursor-not-allowed";

  const NewBadge = () => (
    <span
      aria-label="Nouveau"
      className="absolute -top-2 -right-3 text-[10px] px-2 py-0.5 rounded-full 
        bg-gradient-to-r from-pink-500 to-yellow-400 text-white font-bold shadow
        animate-pulse ring-2 ring-pink-300/50"
    >
      Nouveau
    </span>
  );

  return (
    <nav
      className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-sm sticky top-0 z-50"
      role="navigation"
      aria-label="Menu principal"
    >
      <div className="container mx-auto flex items-center justify-between py-3">
        {/* Logo */}
        <Link
          to="/"
          className="text-xl font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2"
        >
          <span>UInova</span>
          {user?.role === "premium" && (
            <span className="px-2 py-0.5 text-xs rounded bg-yellow-400 text-slate-900 font-semibold">
              Premium
            </span>
          )}
          {user?.role === "admin" && (
            <span className="px-2 py-0.5 text-xs rounded bg-red-600 text-white font-semibold">
              Admin
            </span>
          )}
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

          {/* ⚙️ Admin hub */}
          {user?.role === "admin" && (
            <NavLink to="/admin" className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ""}`}>
              🛠️ Admin Panel
              <NewBadge />
            </NavLink>
          )}

          <NavLink to="/pricing" className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ""}`}>
            Tarifs
          </NavLink>
          <NavLink to="/payment" className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ""}`}>
            Paiement
          </NavLink>
          <NavLink to="/contact" className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ""}`}>
            📩 Contact
          </NavLink>

          {/* Phase 3 – si projet actif */}
          {projectId ? (
            <>
              <NavLink to={`/deploy/${projectId}`} className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ""}`}>
                🚀 Deploy
              </NavLink>
              <NavLink to={`/replay/${projectId}`} className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ""}`}>
                🎬 Replay
              </NavLink>
              <NavLink to={`/ar/${projectId}`} className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ""}`}>
                🕶️ AR/VR
              </NavLink>
            </>
          ) : (
            <>
              <span className={disabledClass}>🚀 Deploy</span>
              <span className={disabledClass}>🎬 Replay</span>
              <span className={disabledClass}>🕶️ AR/VR</span>
            </>
          )}

          <NavLink to="/monitoring" className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ""}`}>
            📊 Monitoring
          </NavLink>

          {/* 🚀 Shortcut IA */}
          <button
            onClick={() => navigate("/ai")}
            className="px-3 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition"
          >
            🤖 Copilot
          </button>
        </div>

        {/* Zone droite */}
        <div className="hidden md:flex items-center space-x-3">
          <ProjectSelector />
          <GlobalSearch /> {/* 🔍 Ajout palette globale Ctrl+K */}

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
              <span className="text-sm text-gray-600 dark:text-gray-300">👋 {user.email}</span>
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
            aria-label="Changer de thème"
            className="px-3 py-2 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition"
          >
            {dark ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>

        {/* Burger menu mobile */}
        <button
          className="md:hidden px-3 py-2 rounded bg-slate-200 dark:bg-slate-700"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu mobile"
        >
          {menuOpen ? "✖️" : "☰"}
        </button>
      </div>

      {/* Menu mobile */}
      {menuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-700 p-4 space-y-2 bg-white dark:bg-slate-900">
          <NavLink to="/" onClick={() => setMenuOpen(false)} className={linkClass}>Dashboard</NavLink>
          <NavLink to="/projects" onClick={() => setMenuOpen(false)} className={linkClass}>Projets</NavLink>
          <NavLink to="/marketplace" onClick={() => setMenuOpen(false)} className={linkClass}>Marketplace</NavLink>
          {user?.role === "admin" && (
            <NavLink to="/admin" onClick={() => setMenuOpen(false)} className={linkClass}>
              🛠️ Admin Panel
              <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full 
                bg-gradient-to-r from-pink-500 to-yellow-400 text-white font-bold shadow animate-pulse ring-2 ring-pink-300/50">
                Nouveau
              </span>
            </NavLink>
          )}
          <NavLink to="/pricing" onClick={() => setMenuOpen(false)} className={linkClass}>Tarifs</NavLink>
          <NavLink to="/payment" onClick={() => setMenuOpen(false)} className={linkClass}>Paiement</NavLink>
          <NavLink to="/contact" onClick={() => setMenuOpen(false)} className={linkClass}>📩 Contact</NavLink>
          <NavLink to="/monitoring" onClick={() => setMenuOpen(false)} className={linkClass}>📊 Monitoring</NavLink>
          <NavLink to="/ai" onClick={() => setMenuOpen(false)} className={linkClass}>🤖 Copilot</NavLink>
          {!user ? (
            <>
              <NavLink to="/login" onClick={() => setMenuOpen(false)} className={linkClass}>Connexion</NavLink>
              <NavLink to="/register" onClick={() => setMenuOpen(false)} className={linkClass}>Inscription</NavLink>
            </>
          ) : (
            <button
              onClick={() => { logout(); setMenuOpen(false); }}
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
