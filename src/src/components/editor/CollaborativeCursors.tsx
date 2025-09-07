import { useEffect, useState } from "react";
import { socket } from "@/services/socketClient";

type CursorData = {
  id: string;
  x: number;
  y: number;
  color: string;
  name?: string; // nom ou email utilisateur
  ts?: number;   // timestamp dernière activité
};

export default function CollaborativeCursors() {
  const [cursors, setCursors] = useState<CursorData[]>([]);

  useEffect(() => {
    // Réception mise à jour curseur
    socket.on("cursor-update", (data: CursorData) => {
      setCursors((prev) => {
        const next = [...prev.filter((c) => c.id !== data.id), { ...data, ts: Date.now() }];
        return next;
      });
    });

    // Nettoyage automatique des curseurs inactifs
    const interval = setInterval(() => {
      setCursors((prev) => prev.filter((c) => Date.now() - (c.ts || 0) < 5000));
    }, 2000);

    return () => {
      socket.off("cursor-update");
      clearInterval(interval);
    };
  }, []);

  return (
    <>
      {cursors.map((c) => (
        <div
          key={c.id}
          aria-label={`Curseur de ${c.name || "utilisateur"}`}
          style={{
            position: "absolute",
            left: c.x,
            top: c.y,
            transform: "translate(-50%, -50%)",
            transition: "left 0.15s linear, top 0.15s linear",
            pointerEvents: "none",
            zIndex: 1000,
          }}
        >
          {/* Curseur rond */}
          <div
            className="w-3 h-3 rounded-full animate-pulse ring-2 ring-white"
            style={{ background: c.color }}
          />
          {/* Label utilisateur */}
          {c.name && (
            <div
              className="text-[10px] px-1 mt-1 rounded bg-black/70 text-white whitespace-nowrap"
              style={{ transform: "translateX(-50%)" }}
            >
              {c.name}
            </div>
          )}
        </div>
      ))}
    </>
  );
}
