import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
  CommandGroup,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Monitor,
  LayoutDashboard,
  FolderOpen,
  ShoppingBag,
  BarChart3,
  Users,
  Cpu,
  History,
} from "lucide-react";

type SearchItem = {
  icon: JSX.Element;
  label: string;
  path: string;
  group: string;
  shortcut?: string;
};

const ALL_ITEMS: SearchItem[] = [
  { icon: <LayoutDashboard className="w-4 h-4" />, label: "Dashboard", path: "/", group: "Navigation", shortcut: "⇧+D" },
  { icon: <FolderOpen className="w-4 h-4" />, label: "Mes Projets", path: "/projects", group: "Navigation", shortcut: "⇧+P" },
  { icon: <ShoppingBag className="w-4 h-4" />, label: "Marketplace", path: "/marketplace", group: "Navigation" },
  { icon: <Monitor className="w-4 h-4" />, label: "Monitoring", path: "/monitoring", group: "Navigation" },
  { icon: <Users className="w-4 h-4" />, label: "Utilisateurs", path: "/admin/users", group: "Admin" },
  { icon: <BarChart3 className="w-4 h-4" />, label: "Usage & Stats", path: "/admin/usage", group: "Admin" },
  { icon: <Cpu className="w-4 h-4" />, label: "Copilot IA", path: "/ai", group: "Outils" },
];

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<SearchItem[]>([]);
  const navigate = useNavigate();

  // 🎹 Raccourci clavier Ctrl+K
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

  // Charger historique
  useEffect(() => {
    const saved = localStorage.getItem("uinova:recent-search");
    if (saved) setRecent(JSON.parse(saved));
  }, []);

  // Sauvegarder historique
  function addRecent(item: SearchItem) {
    const updated = [item, ...recent.filter((r) => r.path !== item.path)].slice(0, 5);
    setRecent(updated);
    localStorage.setItem("uinova:recent-search", JSON.stringify(updated));
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Rechercher (Ctrl+K)"
        className="px-3 py-1 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-sm transition"
      >
        🔍 Rechercher <span className="ml-2 text-xs opacity-70">(Ctrl+K)</span>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command role="search" aria-label="Recherche globale">
          <CommandInput placeholder="Rechercher une page ou une action..." />

          <CommandList>
            <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>

            {/* Historique */}
            {recent.length > 0 && (
              <CommandGroup heading="Récent">
                {recent.map((item) => (
                  <CommandItem
                    key={item.path}
                    onSelect={() => {
                      setOpen(false);
                      navigate(item.path);
                      addRecent(item);
                    }}
                    className="flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <History className="w-4 h-4 text-gray-400" />
                      {item.label}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {recent.length > 0 && <CommandSeparator />}

            {/* Groupes */}
            {["Navigation", "Admin", "Outils"].map((group) => (
              <CommandGroup key={group} heading={group}>
                {ALL_ITEMS.filter((it) => it.group === group).map((item) => (
                  <CommandItem
                    key={item.path}
                    onSelect={() => {
                      setOpen(false);
                      navigate(item.path);
                      addRecent(item);
                    }}
                    className="flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      {item.icon}
                      {item.label}
                    </span>
                    {item.shortcut && (
                      <span className="text-xs text-gray-400">{item.shortcut}</span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
