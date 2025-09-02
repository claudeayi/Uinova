// src/services/collabService.ts
import * as Y from "yjs";
import { io } from "../utils/socket";

const docs = new Map<string, Y.Doc>();

export function getDoc(projectId: string): Y.Doc {
  if (!docs.has(projectId)) {
    docs.set(projectId, new Y.Doc());
  }
  return docs.get(projectId)!;
}

// ⚡ Brancher sur Socket.io
export function setupCollaboration() {
  io.on("connection", (socket) => {
    socket.on("joinProject", (projectId: string) => {
      socket.join(projectId);

      const doc = getDoc(projectId);
      const state = Y.encodeStateAsUpdate(doc);
      socket.emit("sync", state);

      socket.on("update", (update: Uint8Array) => {
        Y.applyUpdate(doc, update);
        socket.to(projectId).emit("update", update);
      });
    });
  });
}
