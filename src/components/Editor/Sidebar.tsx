// src/components/layouts/Sidebar.tsx
import { MousePointerClick, Input as InputIcon, Square, Component } from "lucide-react";

interface SidebarProps {
  onSelect?: (component: string) => void;
}

export default function Sidebar({ onSelect }: SidebarProps) {
  const components = [
    { name: "Button", icon: <MousePointerClick className="w-4 h-4" /> },
    { name: "Input", icon: <InputIcon className="w-4 h-4" /> },
    { name: "Card", icon: <Square className="w-4 h-4" /> },
    { name: "Custom", icon: <Component className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-64 h-full border-r dark:border-slate-700 bg-gray-50 dark:bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b dark:border-slate-700 sticky top-0 bg-gray-50 dark:bg-slate-900 z-10">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">
          📦 Components
        </h3>
      </div>

      {/* Liste des composants */}
      <ul className="flex-1 overflow-y-auto p-3 space-y-2">
        {components.map((c) => (
          <li
            key={c.name}
            role="button"
            tabIndex={0}
            aria-label={`Ajouter ${c.name}`}
            onClick={() => onSelect?.(c.name)}
            onKeyDown={(e) => e.key === "Enter" && onSelect?.(c.name)}
            className="flex items-center gap-2 p-2 rounded border bg-white dark:bg-slate-800 dark:border-slate-700 shadow-sm cursor-pointer transition hover:bg-blue-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {c.icon}
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {c.name}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
