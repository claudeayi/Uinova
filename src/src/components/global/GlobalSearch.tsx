import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Command, CommandDialog, CommandInput, CommandList, CommandItem } from "@/components/ui/command";
import { Monitor, LayoutDashboard, FolderOpen, ShoppingBag, BarChart3, Users, Cpu } from "lucide-react";

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // 🎹 Raccourci clavier Ctrl+K (ou Cmd+K sur Mac)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const items = [
    { icon: <LayoutDashboard className="w-4 h-4" />, label: "Dashboard", path: "/" },
    { icon: <FolderOpen className="w-4 h-4" />, label: "Mes Projets", path: "/projects" },
    { icon: <ShoppingBag className="w-4 h-4" />, label: "Marketplace", path: "/marketplace" },
    { icon: <Monitor className="w-4 h-4" />, label: "Monitoring", path: "/monitoring" },
    { icon: <Users className="w-4 h-4" />, label: "Utilisateurs (Admin)", path: "/admin/users" },
    { icon: <Cpu className="w-4 h-4" />, label: "Copilot IA", path: "/ai" },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-sm"
      >
        🔍 Rechercher (Ctrl+K)
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command>
          <CommandInput placeholder="Rechercher une page ou une action..." />
          <CommandList>
            {items.map((item) => (
              <CommandItem
                key={item.path}
                onSelect={() => {
                  setOpen(false);
                  navigate(item.path);
                }}
                className="flex items-center gap-2 cursor-pointer"
              >
                {item.icon}
                <span>{item.label}</span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
