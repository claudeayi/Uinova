import { Server } from "socket.io";
import http from "http";
import * as Y from "yjs";

// Map en mémoire des documents CRDT
const docs = new Map<string, Y.Doc>();
// Map des utilisateurs présents par projet
const presence = new Map<string, Set<string>>();

export let io: Server;

/**
 * Initialise Socket.io avec ton serveur HTTP
 */
export function initSocket(server: http.Server) {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGINS?.split(",") || ["*"],
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("⚡ Nouveau client connecté:", socket.id);

    /* ============================================================================
     *  JOIN PROJECT ROOM
     * ========================================================================== */
    socket.on("joinProject", ({ projectId, userId }) => {
      if (!projectId || !userId) return;

      socket.join(projectId);

      // CRDT : init doc
      if (!docs.has(projectId)) {
        docs.set(projectId, new Y.Doc());
      }

      // Presence : ajouter l’utilisateur
      if (!presence.has(projectId)) {
        presence.set(projectId, new Set());
      }
      presence.get(projectId)!.add(userId);

      // Informer les autres
      io.to(projectId).emit("presenceUpdate", Array.from(presence.get(projectId)!));

      console.log(`👥 User ${userId} joined project ${projectId}`);
    });

    /* ============================================================================
     *  LEAVE PROJECT ROOM
     * ========================================================================== */
    socket.on("leaveProject", ({ projectId, userId }) => {
      if (!projectId || !userId) return;

      socket.leave(projectId);
      presence.get(projectId)?.delete(userId);

      io.to(projectId).emit("presenceUpdate", Array.from(presence.get(projectId) || []));

      console.log(`👤 User ${userId} left project ${projectId}`);
    });

    /* ============================================================================
     *  TYPING INDICATOR
     * ========================================================================== */
    socket.on("typing", ({ projectId, userId, isTyping }) => {
      if (!projectId || !userId) return;
      socket.to(projectId).emit("typing", { userId, isTyping });
    });

    /* ============================================================================
     *  CRDT UPDATES (Y.js)
     * ========================================================================== */
    socket.on("update", ({ projectId, update }) => {
      if (!projectId || !update) return;

      const doc = docs.get(projectId);
      if (!doc) return;

      try {
        const binaryUpdate = new Uint8Array(update);
        Y.applyUpdate(doc, binaryUpdate);
        socket.to(projectId).emit("update", { update });
      } catch (err) {
        console.error("❌ CRDT update error:", err);
      }
    });

    /* ============================================================================
     *  DISCONNECT
     * ========================================================================== */
    socket.on("disconnect", () => {
      console.log("❌ Client déconnecté:", socket.id);

      // ⚠️ Petite subtilité : pour gérer correctement la présence,
      // il faudrait stocker l’association socketId ↔ userId ↔ projectId
      // et mettre à jour presence ici.
    });
  });

  return io;
}
