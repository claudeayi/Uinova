// src/layouts/Sidebar.tsx
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
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ============================================================================
 *  Sidebar – Navigation principale
 * ========================================================================== */
export default function Sidebar() {
  const location = useLocation();

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

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r dark:border-slate-800 flex flex-col">
      <div className="px-6 py-4 text-xl font-bold text-indigo-600">UInova</div>

      {/* Navigation principale */}
      <nav className="flex-1 px-2 space-y-1">
        {navItems.map((item) => (
          <NavItem key={item.path} {...item} active={location.pathname === item.path} />
        ))}

        <div className="mt-6 mb-2 px-3 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
          Administration
        </div>
        {adminItems.map((item) => (
          <NavItem key={item.path} {...item} active={location.pathname === item.path} />
        ))}
      </nav>
    </aside>
  );
}

/* ============================================================================
 *  NavItem – lien individuel
 * ========================================================================== */
function NavItem({
  label,
  path,
  icon,
  active,
}: {
  label: string;
  path: string;
  icon: JSX.Element;
  active: boolean;
}) {
  return (
    <Link
      to={path}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md transition text-sm font-medium",
        active
          ? "bg-indigo-600 text-white shadow"
          : "text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-slate-800"
      )}
    >
      {icon}
      {label}
    </Link>
  );
}
