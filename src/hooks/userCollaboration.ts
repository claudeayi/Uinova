// src/hooks/useCollaboration.ts
import { useEffect, useState, useCallback } from "react";
import { socket } from "@/services/socket"; // ✅ adapte le chemin à ton projet

/* ============================================================================
 * Types des événements collaboration
 * ========================================================================== */
interface Cursor {
  id: string;
  x: number;
  y: number;
  color: string;
}

interface UsersCountEvent {
  count: number;
}

interface UserEvent {
  id: string;
  email?: string;
  name?: string;
}

export function useCollaboration(projectId?: string) {
  const [onlineUsers, setOnlineUsers] = useState<number>(1);
  const [cursors, setCursors] = useState<Cursor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ============================================================================
   * Connexion / écoute des événements
   * ========================================================================== */
  useEffect(() => {
    try {
      if (projectId) {
        socket.emit("joinProject", { projectId });
      }

      // Compteur d’utilisateurs
      socket.on("usersCount", (data: UsersCountEvent | number) => {
        const count = typeof data === "number" ? data : data.count;
        setOnlineUsers(count);
      });

      // Arrivée / départ utilisateur
      socket.on("userJoined", (user: UserEvent) => {
        console.log("👤 User joined:", user);
      });
      socket.on("userLeft", (user: UserEvent) => {
        console.log("👋 User left:", user);
      });

      // Cursors temps réel
      socket.on("cursorUpdate", (cursor: Cursor) => {
        setCursors((prev) => [
          ...prev.filter((c) => c.id !== cursor.id),
          cursor,
        ]);
      });

      setLoading(false);
    } catch (err: any) {
      console.error("❌ Collaboration error:", err);
      setError("Impossible de se connecter à la collaboration temps réel");
      setLoading(false);
    }

    return () => {
      socket.off("usersCount");
      socket.off("userJoined");
      socket.off("userLeft");
      socket.off("cursorUpdate");
      if (projectId) {
        socket.emit("leaveProject", { projectId });
      }
    };
  }, [projectId]);

  /* ============================================================================
   * Update cursor position (à appeler dans un useEffect lié à la souris)
   * ========================================================================== */
  const updateCursor = useCallback((cursor: Omit<Cursor, "id">) => {
    socket.emit("cursorUpdate", cursor);
  }, []);

  return {
    onlineUsers,
    cursors,
    loading,
    error,
    updateCursor,
  };
}
