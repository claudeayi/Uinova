import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useProject } from "@/context/ProjectContext";
import { useAuth } from "@/hooks/useAuth";

const linkClass =
  "flex items-center gap-2 px-3 py-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition";
const activeClass =
  "bg-slate-300 dark:bg-slate-800 font-semibold text-blue-600 dark:text-blue-400";

const NewBadge = () => (
  <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full 
    bg-gradient-to-r from-pink-500 to-yellow-400 text-white font-bold shadow animate-pulse">
    Nouveau
  </span>
);

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { projectId } = useProject();
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <aside
      className={`h-screen bg-white dark:bg-slate-900 border-r dark:border-slate-700 flex flex-col transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Logo + collapse btn */}
      <div className="flex items-center justify-between p-3 border-b dark:border-slate-700">
        <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
          {collapsed ? "U" : "UInova"}
        </span>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-sm px-2 py-1 rounded bg-slate-200 dark:bg-slate-700"
        >
          {collapsed ? "➡️" : "⬅️"}
        </button>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        <NavLink to="/" className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ""}`}>
          🏠 {collapsed ? "" : "Dashboard"}
        </NavLink>
        <NavLink to="/projects" className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ""}`}>
          📂 {collapsed ? "" : "Projets"}
        </NavLink>
        <NavLink to="/marketplace" className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ""}`}>
          🛒 {collapsed ? "" : "Marketplace"}
        </NavLink>

        {user?.role === "admin" && (
          <NavLink to="/admin" className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ""}`}>
            🛠️ {collapsed ? "" : "Admin Panel"} <NewBadge />
          </NavLink>
        )}

        <NavLink to="/pricing" className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ""}`}>
          💎 {collapsed ? "" : "Tarifs"}
        </NavLink>
        <NavLink to="/payment" className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ""}`}>
          💳 {collapsed ? "" : "Paiement"}
        </NavLink>
        <NavLink to="/contact" className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ""}`}>
          📩 {collapsed ? "" : "Contact"}
        </NavLink>

        {projectId ? (
          <>
            <NavLink to={`/deploy/${projectId}`} className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ""}`}>
              🚀 {collapsed ? "" : "Deploy"}
            </NavLink>
            <NavLink to={`/replay/${projectId}`} className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ""}`}>
              🎬 {collapsed ? "" : "Replay"}
            </NavLink>
            <NavLink to={`/ar/${projectId}`} className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ""}`}>
              🕶️ {collapsed ? "" : "AR/VR"}
            </NavLink>
          </>
        ) : (
          !collapsed && <p className="text-xs text-gray-400 px-3">Aucun projet actif</p>
        )}

        <NavLink to="/monitoring" className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ""}`}>
          📊 {collapsed ? "" : "Monitoring"}
        </NavLink>

        <button
          onClick={() => navigate("/ai")}
          className="w-full flex items-center gap-2 px-3 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition"
        >
          🤖 {collapsed ? "" : "Copilot"}
        </button>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t dark:border-slate-700 text-xs text-gray-400">
        {collapsed ? "©UI" : "© 2025 UInova"}
      </div>
    </aside>
  );
}
