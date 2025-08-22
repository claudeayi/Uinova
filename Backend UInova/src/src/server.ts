// src/server.ts
import http from "node:http";
import app from "./app";
import { setupCollabSocket, io as collabIO } from "./services/collab";

const HOST = process.env.HOST || "0.0.0.0";
const PORT = normalizePort(process.env.PORT || "5000");

// Expose le port à Express (utile pour certains middlewares)
app.set("port", PORT);

// Crée le serveur HTTP
const server = http.createServer(app);

// Durées recommandées (Node 18+) pour éviter des connexions bloquées
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

// Active la collaboration (Socket.io)
setupCollabSocket(server);

// Écoute
server.listen(PORT as number, HOST, () => {
  const base =
    process.env.API_BASE_URL ||
    `http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}`;
  console.log(`✅ UInova API prête sur ${base}`);
  console.log(`📚 Docs: ${base.replace(/\/+$/, "")}/api-docs`);
});

// Gestion d'erreurs serveur
server.on("error", onError);

// Arrêt propre (SIGINT/SIGTERM/SIGUSR2)
["SIGINT", "SIGTERM", "SIGUSR2"].forEach((sig) => {
  process.once(sig as NodeJS.Signals, async () => {
    console.log(`\n⏹️  Signal ${sig} reçu: arrêt en cours...`);
    try {
      // Ferme Socket.io si initialisé
      try {
        // @ts-ignore: close existe si io est instancié
        collabIO?.close?.();
      } catch {}

      // Ferme les connexions HTTP
      await new Promise<void>((resolve) => server.close(() => resolve()));

      console.log("👋 Serveur arrêté proprement.");
      process.exit(0);
    } catch (e) {
      console.error("❌ Erreur à l'arrêt:", e);
      process.exit(1);
    }
  });
});

// Sécurité: log des erreurs non-capturées
process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
  // Option: process.exit(1) si tu préfères tuer le process
});

/* ======================
 * Helpers
 * ====================== */
function normalizePort(val: string): number | string {
  const port = parseInt(val, 10);
  if (Number.isNaN(port)) return val; // named pipe
  if (port >= 0) return port; // port number
  return 5000;
}

function onError(error: any) {
  if (error.syscall !== "listen") throw error;
  const bind = typeof PORT === "string" ? `Pipe ${PORT}` : `Port ${PORT}`;

  switch (error.code) {
    case "EACCES":
      console.error(`${bind} nécessite des privilèges élevés`);
      process.exit(1);
    case "EADDRINUSE":
      console.error(`${bind} est déjà utilisé`);
      process.exit(1);
    default:
      throw error;
  }
}
