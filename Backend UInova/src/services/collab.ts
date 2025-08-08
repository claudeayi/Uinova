import { Server } from 'socket.io';

export function setupCollabSocket(server: any) {
  const io = new Server(server, { cors: { origin: '*' } });

  io.on('connection', (socket) => {
    socket.on('joinRoom', ({ projectId, pageId }) => {
      const room = `${projectId}-${pageId}`;
      socket.join(room);
      const count = io.sockets.adapter.rooms.get(room)?.size || 1;
      io.to(room).emit('usersCount', count);
    });

    socket.on('updateElements', ({ projectId, pageId, elements }) => {
      const room = `${projectId}-${pageId}`;
      socket.to(room).emit('updateElements', { projectId, pageId, elements });
    });

    socket.on('disconnect', () => {
      // Gestion du départ d’un utilisateur (optionnel)
    });
  });
}
