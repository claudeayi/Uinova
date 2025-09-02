import { useAuth } from "@/hooks/useAuth";
import { Sun, Moon, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { useEffect, useState } from "react";

export default function AdminTopbar() {
  const { user, logout } = useAuth();
  const [dark, setDark] = useState(
    () => localStorage.getItem("theme") === "dark"
  );

  // 🌙 Gestion dark mode
  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b bg-white dark:bg-slate-900 dark:border-slate-800">
      {/* Logo / Titre */}
      <h1 className="text-lg font-bold text-gray-800 dark:text-gray-200">
        ⚙️ Cockpit Admin
      </h1>

      {/* Actions */}
      <div className="flex items-center gap-4">
        {/* Toggle Dark Mode */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDark((d) => !d)}
          aria-label="Toggle Dark Mode"
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </Button>

        {/* Profil */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold">
            {user?.email?.[0]?.toUpperCase() || "A"}
          </div>
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {user?.email || "Admin"}
          </span>
        </div>

        {/* Logout */}
        <Button
          variant="destructive"
          size="sm"
          onClick={() => {
            logout();
            toast("👋 Déconnecté");
          }}
        >
          <LogOut size={16} className="mr-1" />
          Logout
        </Button>
      </div>
    </header>
  );
}
