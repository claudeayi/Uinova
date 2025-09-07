import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  PlaySquare,
  FileText,
  CreditCard,
  Link2,
  Mail,
  Building,
  BarChart3,
  Menu,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { useState } from "react";

interface AdminNavItem {
  path: string;
  label: string;
  icon: JSX.Element;
}

const navItems: AdminNavItem[] = [
  { path: "/admin", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
  { path: "/admin/users", label: "Utilisateurs", icon: <Users size={18} /> },
  { path: "/admin/projects", label: "Projets", icon: <FolderKanban size={18} /> },
  { path: "/admin/replays", label: "Replays", icon: <PlaySquare size={18} /> },
  { path: "/admin/logs", label: "Logs", icon: <FileText size={18} /> },
  { path: "/admin/payments", label: "Paiements", icon: <CreditCard size={18} /> },
  { path: "/admin/webhooks", label: "Webhooks", icon: <Link2 size={18} /> },
  { path: "/admin/email-templates", label: "Emails", icon: <Mail size={18} /> },
  { path: "/admin/organizations", label: "Organisations", icon: <Building size={18} /> },
  { path: "/admin/usage", label: "Usage", icon: <BarChart3 size={18} /> },
];

export default function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Card
      as="aside"
      className={`h-screen shadow-md rounded-none border-r dark:bg-slate-900 dark:border-slate-800 flex flex-col transition-all duration-300 ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b dark:border-slate-800">
        <span className="font-bold text-indigo-600 dark:text-indigo-400 text-lg truncate">
          {collapsed ? "U" : "UInova"}
        </span>
        <button
          onClick={() => setCollapsed((c) => !c)}
          aria-label="Toggle sidebar"
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-800"
        >
          <Menu size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav
        aria-label="Navigation admin"
        className="flex-1 overflow-y-auto py-4 space-y-1"
      >
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive
                  ? "bg-indigo-600 text-white"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
              }`
            }
            title={collapsed ? item.label : undefined} // tooltip quand réduit
          >
            {item.icon}
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer (optionnel : version / infos) */}
      <div className="px-4 py-3 border-t text-xs text-gray-500 dark:text-gray-400 dark:border-slate-800">
        {!collapsed && <span>v1.0.0 • Admin</span>}
      </div>
    </Card>
  );
}
