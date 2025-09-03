import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Film,
  Mail,
  Zap,
  CreditCard,
} from "lucide-react";

export default function AdminSidebar() {
  const { pathname } = useLocation();

  const links = [
    { to: "/admin", label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
    { to: "/admin/users", label: "Utilisateurs", icon: <Users className="w-5 h-5" /> },
    { to: "/admin/projects", label: "Projets", icon: <FolderKanban className="w-5 h-5" /> },
    { to: "/admin/replays", label: "Replays", icon: <Film className="w-5 h-5" /> },
    { to: "/admin/email-templates", label: "Templates Email", icon: <Mail className="w-5 h-5" /> },
    { to: "/admin/webhooks", label: "Webhooks", icon: <Zap className="w-5 h-5" /> },
    { to: "/admin/billing", label: "Facturation", icon: <CreditCard className="w-5 h-5" /> },
  ];

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r dark:border-slate-800 p-4 space-y-2">
      <h2 className="text-lg font-bold mb-4 text-blue-600">⚙️ Admin</h2>
      <nav className="flex flex-col gap-1">
        {links.map(({ to, label, icon }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition",
              pathname === to
                ? "bg-blue-50 dark:bg-slate-800 text-blue-600 font-semibold"
                : "text-gray-600 dark:text-gray-300"
            )}
          >
            {icon}
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
