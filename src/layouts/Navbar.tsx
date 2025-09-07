import { useState, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useProject } from "@/context/ProjectContext";
import { useAuth } from "@/hooks/useAuth";
import ProjectSelector from "@/components/projects/ProjectSelector";
import GlobalSearch from "@/components/global/GlobalSearch";
import { toast } from "react-hot-toast";
import clsx from "clsx";

export default function Navbar() {
  const [dark, setDark] = useState(
    () => localStorage.getItem("theme") === "dark" ||
          (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches)
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const { projectId } = useProject();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  const linkClass =
    "relative px-3 py-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition focus:outline-none focus:ring-2 focus:ring-indigo-500";
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

  const handleLogout = () => {
    logout();
    toast.success("👋 Déconnecté avec succès");
    navigate("/login");
  };

  return (
    <nav
      className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-sm sticky top-0 z-50"
      role="navigation"
      aria-label="Menu principal"
    >
      <div className="container mx-auto flex items-center justify-between py-3 px-4 md:px-0">
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
          {[
            { to: "/", label: "Dashboard" },
            { to: "/projects", label: "Projets" },
            { to: "/marketplace", label: "Marketplace" },
          ].map(({ to, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => clsx(linkClass, isActive && activeClass)}>
              {label}
            </NavLink>
          ))}

          {/* ⚙️ Admin hub */}
          {user?.role === "admin" && (
            <NavLink to="/admin" className={({ isActive }) => clsx(linkClass, isActive && activeClass)}>
              🛠️ Admin Panel
              <NewBadge />
            </NavLink>
          )}

          <NavLink to="/pricing" className={({ isActive }) => clsx(linkClass, isActive && activeClass)}>
            Tarifs
          </NavLink>
          <NavLink to="/payment" className={({ isActive }) => clsx(linkClass, isActive && activeClass)}>
            Paiement
          </NavLink>
          <NavLink to="/contact" className={({ isActive }) => clsx(linkClass, isActive && activeClass)}>
            📩 Contact
          </NavLink>

          {/* Projet actif */}
          {projectId ? (
            <>
              <NavLink to={`/deploy/${projectId}`} className={({ isActive }) => clsx(linkClass, isActive && activeClass)}>
                🚀 Deploy
              </NavLink>
              <NavLink to={`/replay/${projectId}`} className={({ isActive }) => clsx(linkClass, isActive && activeClass)}>
                🎬 Replay
              </NavLink>
              <NavLink to={`/ar/${projectId}`} className={({ isActive }) => clsx(linkClass, isActive && activeClass)}>
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

          <NavLink to="/monitoring" className={({ isActive }) => clsx(linkClass, isActive && activeClass)}>
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
          <GlobalSearch />

          {!user ? (
            <>
              <NavLink to="/login" className={({ isActive }) => clsx(linkClass, isActive && activeClass)}>
                Connexion
              </NavLink>
              <NavLink to="/register" className={({ isActive }) => clsx(linkClass, isActive && activeClass)}>
                Inscription
              </NavLink>
            </>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 dark:text-gray-300">👋 {user.email}</span>
              <button
                onClick={handleLogout}
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
        <div
          className="md:hidden border-t border-slate-200 dark:border-slate-700 p-4 space-y-2 bg-white dark:bg-slate-900 animate-slideDown"
          role="menu"
        >
          {[
            { to: "/", label: "Dashboard" },
            { to: "/projects", label: "Projets" },
            { to: "/marketplace", label: "Marketplace" },
            { to: "/pricing", label: "Tarifs" },
            { to: "/payment", label: "Paiement" },
            { to: "/contact", label: "📩 Contact" },
            { to: "/monitoring", label: "📊 Monitoring" },
            { to: "/ai", label: "🤖 Copilot" },
          ].map(({ to, label }) => (
            <NavLink key={to} to={to} onClick={() => setMenuOpen(false)} className={linkClass}>
              {label}
            </NavLink>
          ))}

          {user?.role === "admin" && (
            <NavLink to="/admin" onClick={() => setMenuOpen(false)} className={linkClass}>
              🛠️ Admin Panel <NewBadge />
            </NavLink>
          )}

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
                handleLogout();
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
