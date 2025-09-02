// frontend/src/components/NotificationCenter.tsx
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { socket } from "@/services/socket";

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<{ id: string; message: string }[]>([]);

  useEffect(() => {
    socket.on("notification", (notif) => {
      setNotifications((prev) => [notif, ...prev]);
    });
    return () => { socket.off("notification"); };
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative">
        <Bell className="w-6 h-6" />
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1">
            {notifications.length}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {notifications.length === 0 ? (
          <DropdownMenuItem>Aucune notification</DropdownMenuItem>
        ) : (
          notifications.map((n) => (
            <DropdownMenuItem key={n.id}>{n.message}</DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
