// src/layouts/Sidebar.tsx
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Boxes,
  Users,
  PlayCircle,
  CreditCard,
  BarChart3,
  FileText,
  ShoppingBag,
  Settings,
  Rocket,
  Film,
  Scan,
  ChevronDown,
  ChevronRight,
  Bell,
  Award,
  Cpu,
  BarChart4,
  Layers,
  Puzzle,
  Receipt,
  LogOut,
  User,
  LogIn,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProject } from "@/context/ProjectContext";
import { useAuth } from "@/hooks/useAuth";

/* ============================================================================
 *  Sidebar – Navigation UInova v5
 * ========================================================================== */
export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { projectId } = useProject();
  const { user, logout } = useAuth();

  const [adminOpen, setAdminOpen] = useState(true);
  const [projectOpen, setProjectOpen] = useState(true);
  const [toolsOpen, setToolsOpen] = useState(true);
  const [marketplaceOpen, setMarketplaceOpen] = useState(true);

  /* ===============================
   * Menus
   * =============================== */
  const navItems = [
    { label: "Dashboard", path: "/", icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: "Projets", path: "/projects", icon: <Boxes className="w-5 h-5" /> },
  ];

  const marketplaceItems = [
    { label: "Templates", path: "/marketplace?filter=template", icon: <Layers className="w-5 h-5" /> },
    { label: "Composants", path: "/marketplace?filter=component", icon: <Puzzle className="w-5 h-5" /> },
    { label: "Achats", path: "/marketplace/purchases", icon: <Receipt className="w-5 h-5" /> },
  ];

  const adminItems = [
    { label: "Stats", path: "/admin/stats", icon: <BarChart3 className="w-5 h-5" /> },
    { label: "Utilisateurs", path: "/admin/users", icon: <Users className="w-5 h-5" /> },
    { label: "Projets", path: "/admin/projects", icon: <Boxes className="w-5 h-5" /> },
    { label: "Replays", path: "/admin/replays", icon: <PlayCircle className="w-5 h-5" /> },
    { label: "Paiements", path: "/admin/payments", icon: <CreditCard className="w-5 h-5" /> },
    { label: "Facturation", path: "/admin/billing", icon: <Settings className="w-5 h-5" /> },
    { label: "Logs", path: "/admin/logs", icon: <FileText className="w-5 h-5" /> },
  ];

  const projectItems = [
    { label: "Deploy", path: `/deploy/${projectId}`, icon: <Rocket className="w-5 h-5" /> },
    { label: "Replay", path: `/replay/${projectId}`, icon: <Film className="w-5 h-5" /> },
    { label: "AR/VR", path: `/ar/${projectId}`, icon: <Scan className="w-5 h-5" /> },
  ];

  const toolsItems = [
    { label: "Monitoring", path: "/monitoring", icon: <BarChart4 className="w-5 h-5" /> },
    { label: "Copilot IA", path: "/ai", icon: <Cpu className="w-5 h-5" /> },
    { label: "Notifications", path: "/notifications", icon: <Bell className="w-5 h-5" /> },
    { label: "Badges", path: "/badges", icon: <Award className="w-5 h-5" /> },
    { label: "Paramètres", path: "/settings", icon: <Settings className="w-5 h-5" /> }, // ✅ ajouté
  ];

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r dark:border-slate-800 flex flex-col">
      {/* Header Logo */}
      <div className="px-6 py-4 text-xl font-extrabold text-indigo-600 dark:text-indigo-400 tracking-wide">
        UInova
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 space-y-1">
        {navItems.map((item) => (
          <NavItem key={item.path} {...item} active={location.pathname === item.path} />
        ))}

        {/* Marketplace */}
        <SectionHeader label="Marketplace" open={marketplaceOpen} toggle={() => setMarketplaceOpen((o) => !o)} />
        {marketplaceOpen &&
          marketplaceItems.map((item) => (
            <NavItem key={item.path} {...item} active={location.pathname.startsWith(item.path)} className="ml-4" />
          ))}

        {/* Projet actif */}
        {projectId ? (
          <>
            <SectionHeader label="Projet actif" open={projectOpen} toggle={() => setProjectOpen((o) => !o)} />
            {projectOpen &&
              projectItems.map((item) => (
                <NavItem key={item.path} {...item} active={location.pathname.startsWith(item.path)} className="ml-4" />
              ))}
          </>
        ) : (
          <p className="mt-6 px-3 text-xs italic text-gray-400">Aucun projet actif</p>
        )}

        {/* Outils */}
        <SectionHeader label="Outils" open={toolsOpen} toggle={() => setToolsOpen((o) => !o)} />
        {toolsOpen &&
          toolsItems.map((item) => (
            <NavItem key={item.path} {...item} active={location.pathname.startsWith(item.path)} className="ml-4" />
          ))}

        {/* Admin */}
        {user?.role === "ADMIN" && (
          <>
            <SectionHeader label="Administration" open={adminOpen} toggle={() => setAdminOpen((o) => !o)} />
            {adminOpen &&
              adminItems.map((item) => (
                <NavItem key={item.path} {...item} active={location.pathname.startsWith(item.path)} className="ml-4" />
              ))}
          </>
        )}
      </nav>

      {/* Footer Auth */}
      <div className="p-4 border-t dark:border-slate-700">
        {user ? (
          <div className="space-y-2">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 truncate">{user.email}</div>
            <Link
              to="/profile"
              className="flex items-center gap-2 px-3 py-2 rounded text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              <User className="w-4 h-4" /> Profil
            </Link>
            <button
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm bg-red-600 text-white hover:bg-red-700"
            >
              <LogOut className="w-4 h-4" /> Déconnexion
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <Link
              to="/login"
              className="flex items-center gap-2 px-3 py-2 rounded text-sm bg-indigo-600 text-white hover:bg-indigo-700"
            >
              <LogIn className="w-4 h-4" /> Connexion
            </Link>
            <Link
              to="/register"
              className="flex items-center gap-2 px-3 py-2 rounded text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              <UserPlus className="w-4 h-4" /> Inscription
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}

/* ============================================================================
 *  NavItem
 * ========================================================================== */
function NavItem({
  label,
  path,
  icon,
  active,
  className,
}: {
  label: string;
  path: string;
  icon: JSX.Element;
  active: boolean;
  className?: string;
}) {
  return (
    <Link
      to={path}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md transition text-sm font-medium",
        active
          ? "bg-indigo-600 text-white shadow"
          : "text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-slate-800",
        className
      )}
    >
      {icon}
      {label}
    </Link>
  );
}

/* ============================================================================
 *  SectionHeader
 * ========================================================================== */
function SectionHeader({ label, open, toggle }: { label: string; open: boolean; toggle: () => void }) {
  return (
    <div
      className="mt-6 mb-2 px-3 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 flex items-center justify-between cursor-pointer"
      onClick={toggle}
    >
      <span>{label}</span>
      {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
    </div>
  );
}
