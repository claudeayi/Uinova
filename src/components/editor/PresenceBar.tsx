import React, { useMemo } from "react";
import { useAppStore } from "../../store/useAppStore";

function makeAvatars(n: number) {
  // avatars fictifs U1, U2, … avec couleurs stables
  const base = ["#ef4444","#f59e0b","#10b981","#3b82f6","#8b5cf6","#ec4899","#14b8a6","#22c55e"];
  return Array.from({ length: Math.max(1, n) }).map((_, i) => ({
    label: `U${i + 1}`,
    color: base[i % base.length],
  }));
}

export default function PresenceBar() {
  const onlineUsers = useAppStore((s) => s.onlineUsers || 1);

  const avatars = useMemo(() => makeAvatars(onlineUsers), [onlineUsers]);

  return (
    <div className="flex items-center justify-end gap-3 text-sm px-3 py-2 bg-white/70 dark:bg-gray-800/70 border rounded mb-3">
      <div className="flex -space-x-2">
        {avatars.map((a, idx) => (
          <div
            key={idx}
            title={a.label}
            className="h-6 w-6 rounded-full ring-2 ring-white dark:ring-gray-900 flex items-center justify-center text-[10px] font-semibold text-white"
            style={{ background: a.color }}
          >
            {a.label}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-flex h-2 w-2 rounded-full bg-green-500" />
        <span>{onlineUsers} en ligne</span>
      </div>
    </div>
  );
}
