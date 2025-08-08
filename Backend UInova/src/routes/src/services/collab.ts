import { Server } from "socket.io";

export function setupCollabSocket(server: any) {
  const io = new Server(server, { cors: { origin: "*" } });

  io.on("connection", (socket) => {
    socket.on("joinRoom", ({ projectId, pageId }) => {
      socket.join(`${projectId}-${pageId}`);
      io.to(`${projectId}-${pageId}`).emit("usersCount", io.sockets.adapter.rooms.get(`${projectId}-${pageId}`)?.size || 1);
    });
    socket.on("updateElements", ({ projectId, pageId, elements }) => {
      socket.to(`${projectId}-${pageId}`).emit("updateElements", { projectId, pageId, elements });
    });
    socket.on("disconnect", () => {});
  });
}
