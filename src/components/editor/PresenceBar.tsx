// src/components/editor/PresenceBar.tsx
import React from "react";
import { useAppStore } from "../../store/useAppStore";

export default function PresenceBar() {
  const onlineUsers = useAppStore((s) => s.onlineUsers || 1);

  return (
    <div className="flex items-center justify-end gap-2 text-sm px-3 py-2 bg-white/70 dark:bg-gray-800/70 border rounded mb-3">
      <span className="inline-flex h-2 w-2 rounded-full bg-green-500" />
      <span>{onlineUsers} en ligne</span>
    </div>
  );
}
