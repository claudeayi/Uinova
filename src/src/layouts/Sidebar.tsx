// src/layouts/Sidebar.tsx
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProject } from "@/context/ProjectContext";

/* ============================================================================
 *  Sidebar – Navigation principale UInova
 * ========================================================================== */
export default function Sidebar() {
  const location = useLocation();
  const { projectId } = useProject();

  const [adminOpen, setAdminOpen] = useState(true);
  const [projectOpen, setProjectOpen] = useState(true);

  const navItems = [
    { label: "Dashboard", path: "/", icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: "Projets", path: "/projects", icon: <Boxes className="w-5 h-5" /> },
    { label: "Marketplace", path: "/marketplace", icon: <ShoppingBag className="w-5 h-5" /> },
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

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r dark:border-slate-800 flex flex-col">
      {/* Logo */}
      <div className="px-6 py-4 text-xl font-extrabold text-indigo-600 dark:text-indigo-400 tracking-wide">
        UInova
      </div>

      {/* Navigation principale */}
      <nav className="flex-1 px-2 space-y-1">
        {navItems.map((item) => (
          <NavItem key={item.path} {...item} active={location.pathname === item.path} />
        ))}

        {/* Section Projets actifs */}
        {projectId ? (
          <>
            <div
              className="mt-6 mb-2 px-3 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 flex items-center justify-between cursor-pointer"
              onClick={() => setProjectOpen((o) => !o)}
            >
              <span>Projet actif</span>
              {projectOpen ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </div>
            {projectOpen &&
              projectItems.map((item) => (
                <NavItem
                  key={item.path}
                  {...item}
                  active={location.pathname.startsWith(item.path)}
                  className="ml-4"
                />
              ))}
          </>
        ) : (
          <p className="mt-6 px-3 text-xs italic text-gray-400">
            Aucun projet actif
          </p>
        )}

        {/* Section Administration */}
        <div
          className="mt-6 mb-2 px-3 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 flex items-center justify-between cursor-pointer"
          onClick={() => setAdminOpen((o) => !o)}
        >
          <span>Administration</span>
          {adminOpen ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </div>
        {adminOpen &&
          adminItems.map((item) => (
            <NavItem
              key={item.path}
              {...item}
              active={location.pathname.startsWith(item.path)}
              className="ml-4"
            />
          ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t dark:border-slate-700 text-xs text-gray-400 text-center">
        © {new Date().getFullYear()} UInova
      </div>
    </aside>
  );
}

/* ============================================================================
 *  NavItem – lien individuel stylé
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
