import { useAuth } from "@/hooks/useAuth";
import { Sun, Moon, LogOut, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { useEffect, useState } from "react";

export default function AdminTopbar() {
  const { user, logout } = useAuth();
  const [dark, setDark] = useState(
    () => localStorage.getItem("theme") === "dark"
  );
  const [time, setTime] = useState(new Date());

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

  // ⏰ Horloge en temps réel
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b bg-white dark:bg-slate-900 dark:border-slate-800 transition-colors">
      {/* Logo / Titre */}
      <h1 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
        ⚙️ Cockpit Admin
      </h1>

      {/* Actions */}
      <div className="flex items-center gap-6">
        {/* Heure actuelle */}
        <div className="hidden md:block text-sm font-mono text-gray-600 dark:text-gray-400">
          {time.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </div>

        {/* Toggle Dark Mode */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDark((d) => !d)}
          aria-label="Toggle Dark Mode"
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </Button>

        {/* Profil + Menu */}
        <div className="relative group">
          <button
            className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded px-2 py-1"
            aria-label="Ouvrir le menu utilisateur"
          >
            <div className="h-8 w-8 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold">
              {user?.email?.[0]?.toUpperCase() || "A"}
            </div>
            <span className="hidden md:block text-sm text-gray-700 dark:text-gray-300">
              {user?.email || "Admin"}
            </span>
          </button>

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition">
            <button className="w-full px-3 py-2 flex items-center gap-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700">
              <User size={14} /> Profil
            </button>
            <button className="w-full px-3 py-2 flex items-center gap-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700">
              <Settings size={14} /> Paramètres
            </button>
            <button
              onClick={() => {
                logout();
                toast.success("👋 Déconnecté avec succès");
              }}
              className="w-full px-3 py-2 flex items-center gap-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-slate-700"
            >
              <LogOut size={14} /> Déconnexion
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
