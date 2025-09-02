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
} from "lucide-react";
import { Card } from "@/components/ui/card";

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
  return (
    <Card className="w-64 h-screen shadow-md rounded-none border-r dark:bg-slate-900 dark:border-slate-800">
      <nav className="flex flex-col py-6 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-md transition ${
                isActive
                  ? "bg-indigo-600 text-white"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>
    </Card>
  );
}
