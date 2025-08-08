import { createServer } from 'http';
import app from './app';
import { setupCollabSocket } from './services/collab';

const PORT = process.env.PORT || 5000;

const server = createServer(app);

// Active la collaboration live (Socket.io)
setupCollabSocket(server);

server.listen(PORT, () => {
  console.log(`UInova API en écoute sur le port ${PORT}`);
});
