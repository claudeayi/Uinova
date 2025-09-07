// frontend/src/components/NotificationCenter.tsx
import { useEffect, useState } from "react";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { socket } from "@/services/socket";

// Type des notifications
interface Notification {
  id: string;
  message: string;
  createdAt: string;
  read?: boolean;
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  /* ------------------------------
     Charger depuis localStorage
  ------------------------------ */
  useEffect(() => {
    const saved = localStorage.getItem("uinova:notifications");
    if (saved) {
      try {
        setNotifications(JSON.parse(saved));
      } catch {
        console.warn("⚠️ Notifications corrompues en cache");
      }
    }
  }, []);

  /* ------------------------------
     Sauvegarder dans localStorage
  ------------------------------ */
  useEffect(() => {
    localStorage.setItem("uinova:notifications", JSON.stringify(notifications));
  }, [notifications]);

  /* ------------------------------
     Socket.io écoute
  ------------------------------ */
  useEffect(() => {
    socket.on("notification", (notif: { id: string; message: string }) => {
      const enriched: Notification = {
        ...notif,
        createdAt: new Date().toISOString(),
        read: false,
      };
      setNotifications((prev) => [enriched, ...prev].slice(0, 20)); // max 20
    });
    return () => {
      socket.off("notification");
    };
  }, []);

  /* ------------------------------
     Actions
  ------------------------------ */
  const unreadCount = notifications.filter((n) => !n.read).length;

  function markAsRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }

  function markAllAsRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function clearAll() {
    if (!window.confirm("Voulez-vous effacer toutes les notifications ?")) return;
    setNotifications([]);
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "À l’instant";
    if (mins < 60) return `il y a ${mins} min`;
    const h = Math.floor(mins / 60);
    if (h < 24) return `il y a ${h} h`;
    const d = Math.floor(h / 24);
    return `il y a ${d} j`;
  }

  /* ------------------------------
     Rendu
  ------------------------------ */
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative focus:outline-none">
        <Bell className="w-6 h-6 text-gray-700 dark:text-gray-200" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1">
            {unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-80 max-h-96 overflow-y-auto">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {notifications.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={markAllAsRead}
                className="text-xs text-blue-600 flex items-center gap-1"
              >
                <CheckCheck size={14} /> Tout lu
              </button>
              <button
                onClick={clearAll}
                className="text-xs text-red-600 flex items-center gap-1"
              >
                <Trash2 size={14} /> Effacer
              </button>
            </div>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {notifications.length === 0 ? (
          <DropdownMenuItem disabled className="text-gray-500">
            Aucune notification
          </DropdownMenuItem>
        ) : (
          notifications.map((n) => (
            <DropdownMenuItem
              key={n.id}
              onClick={() => markAsRead(n.id)}
              className={`flex flex-col items-start text-sm ${
                n.read
                  ? "opacity-70 cursor-default"
                  : "font-medium cursor-pointer"
              }`}
            >
              <span>{n.message}</span>
              <span className="text-xs text-gray-400">
                {timeAgo(n.createdAt)}
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
