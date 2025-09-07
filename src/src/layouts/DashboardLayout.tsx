// src/layouts/DashboardLayout.tsx
import { ReactNode, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Sun, Moon, Bell, Menu, LogOut, User } from "lucide-react";
import { useTheme } from "@/hooks/useTheme"; // hook perso
import { cn } from "@/lib/utils"; // merge classes tailwind
import { toast } from "react-hot-toast";
// import { NotificationCenter } from "@/components/NotificationCenter"; // 🔔 si dispo

type DashboardLayoutProps = {
  children: ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    toast.success("✅ Déconnexion réussie");
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* ===== Sidebar ===== */}
      <aside
        className={cn(
          "flex flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 transition-all duration-300 ease-in-out",
          sidebarOpen ? "w-64" : "w-16"
        )}
        role="navigation"
        aria-label="Sidebar"
      >
        <div className="flex items-center justify-between p-4">
          <Link
            to="/dashboard"
            className="text-xl font-bold text-indigo-600 dark:text-indigo-400"
          >
            UInova
          </Link>
          <button
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
          >
            <Menu size={20} />
          </button>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1 text-sm">
          <NavItem to="/dashboard" label="Dashboard" />
          <NavItem to="/projects" label="Mes projets" />
          <NavItem to="/editor" label="Éditeur" />
          <NavItem to="/marketplace" label="Marketplace" />
          <NavItem to="/monitoring" label="Monitoring" />
          <NavItem to="/replays" label="Replays" />
          <NavItem to="/deploy" label="Déploiements" />
          <NavItem to="/admin" label="Admin Panel" />
          <NavItem to="/contact" label="Contact" />
        </nav>
      </aside>

      {/* ===== Contenu principal ===== */}
      <div className="flex flex-col flex-1">
        {/* Navbar */}
        <header className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
          <div className="font-semibold text-lg text-gray-800 dark:text-gray-200">
            ⚡ Cockpit
          </div>

          <div className="flex items-center gap-3">
            {/* Toggle Dark Mode */}
            <button
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={toggleTheme}
              aria-label="Toggle Dark Mode"
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            {/* Notifications */}
            <button
              className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Notifications"
            >
              <Bell size={18} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            {/* 🔔 Ici tu peux remplacer par <NotificationCenter /> */}

            {/* Profil */}
            <button
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Mon profil"
            >
              <User size={18} />
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600"
            >
              <LogOut size={16} /> Déconnexion
            </button>
          </div>
        </header>

        {/* Contenu */}
        <main
          className="flex-1 overflow-y-auto p-6"
          role="main"
          aria-label="Contenu principal"
        >
          {children}
        </main>

        {/* Footer */}
        <footer className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 text-center">
          © {new Date().getFullYear()} <span className="font-semibold">UInova</span> — Révolution du no-code.
        </footer>
      </div>
    </div>
  );
}

/* ============================================================================
 * NavItem — liens sidebar avec état actif
 * ========================================================================== */
function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center px-3 py-2 rounded-md transition",
          isActive
            ? "bg-indigo-600 text-white font-medium"
            : "text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-gray-800"
        )
      }
    >
      {label}
    </NavLink>
  );
}
