// src/services/collab.ts
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT = 5;

/* ============================================================================
 * Connexion
 * ========================================================================== */
export function connectCollab(projectId: string, token: string): Socket {
  if (socket && socket.connected) {
    console.info("⚡ Déjà connecté au serveur collaboratif.");
    return socket;
  }

  socket = io(import.meta.env.VITE_API_URL as string, {
    path: "/collab", // namespace dédié si backend l’expose
    auth: { token },
    query: { projectId },
    reconnection: true,
    reconnectionAttempts: MAX_RECONNECT,
    reconnectionDelay: 2000,
    timeout: 10000,
    transports: ["websocket"], // forcé pour stabilité
  });

  /* === Listeners globaux === */
  socket.on("connect", () => {
    reconnectAttempts = 0;
    console.info("✅ Collab connecté :", socket?.id);
  });

  socket.on("disconnect", (reason) => {
    console.warn("❌ Collab déconnecté :", reason);
  });

  socket.on("connect_error", (err) => {
    reconnectAttempts++;
    console.error("⚠️ Erreur connexion collab :", err.message);
    if (reconnectAttempts >= MAX_RECONNECT) {
      console.error("⛔ Nombre max de tentatives atteint.");
      socket?.disconnect();
    }
  });

  // Heartbeat pour détecter timeouts
  let heartbeat: NodeJS.Timeout | null = setInterval(() => {
    if (socket && socket.connected) {
      socket.emit("ping");
    }
  }, 15000);

  socket.on("pong", () => {
    console.debug("📡 Pong reçu du serveur collab");
  });

  // Nettoyage si socket se ferme
  socket.on("disconnect", () => {
    if (heartbeat) clearInterval(heartbeat);
  });

  return socket;
}

/* ============================================================================
 * Déconnexion
 * ========================================================================== */
export function disconnectCollab() {
  if (socket) {
    console.info("🔌 Déconnexion collab...");
    socket.disconnect();
    socket = null;
  }
}

/* ============================================================================
 * Helpers
 * ========================================================================== */
export function onCollabEvent<T = any>(
  event: string,
  callback: (data: T) => void
) {
  socket?.on(event, callback);
}

export function offCollabEvent(event: string) {
  socket?.off(event);
}

export function emitCollabEvent(event: string, payload: any) {
  if (!socket || !socket.connected) {
    console.warn("⚠️ Impossible d’émettre, socket non connectée");
    return;
  }
  socket.emit(event, payload);
}

export function isCollabConnected(): boolean {
  return !!socket?.connected;
}
