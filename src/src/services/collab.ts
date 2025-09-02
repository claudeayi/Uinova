import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function connectCollab(projectId: string, token: string) {
  if (!socket) {
    socket = io(import.meta.env.VITE_API_URL as string, {
      auth: { token },
      query: { projectId },
    });
  }
  return socket;
}

export function disconnectCollab() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
