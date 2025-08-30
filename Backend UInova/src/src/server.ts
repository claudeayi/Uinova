import http from "node:http";
import app from "./app";
import { setupCollabSocket, io as collabIO } from "./services/collab";
import collabRoutes from "./routes/collabRoutes";   // 🔹 nouveau import
import { prisma } from "./utils/prisma";

const HOST = process.env.HOST || "0.0.0.0";
const PORT = normalizePort(process.env.PORT || "5000");

// Brancher routes collab REST
app.use("/api/collab", collabRoutes);   // 🔹 nouveau

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
  console.log(`\x1b[32m✅ UInova API prête sur ${base}\x1b[0m`);
  console.log(`📚 Docs: ${base.replace(/\/+$/, "")}/api-docs`);
});

// Gestion d'erreurs serveur
server.on("error", onError);

// Monitoring connexions actives
server.on("connection", () => {
  const count = collabIO?.engine?.clientsCount || 0;
  console.log(`🌐 Nouvelle connexion TCP | Sockets actifs: ${count}`);
});

// Arrêt propre (SIGINT/SIGTERM/SIGUSR2)
["SIGINT", "SIGTERM", "SIGUSR2"].forEach((sig) => {
  process.once(sig as NodeJS.Signals, async () => {
    console.log(`\n⏹️  Signal ${sig} reçu: arrêt en cours...`);
    try {
      // Ferme Socket.io si initialisé
      try {
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

/* ======================
 * Gestion erreurs globales
 * ====================== */
process.on("unhandledRejection", async (reason: any) => {
  console.error("UNHANDLED REJECTION:", reason);

  try {
    await prisma.auditLog.create({
      data: {
        action: "unhandledRejection",
        metadata: { reason: String(reason) },
      },
    });
  } catch (e) {
    console.error("❌ Impossible d'écrire dans AuditLog:", e);
  }
});

process.on("uncaughtException", async (err: Error) => {
  console.error("UNCAUGHT EXCEPTION:", err);

  try {
    await prisma.auditLog.create({
      data: {
        action: "uncaughtException",
        metadata: { message: err.message, stack: err.stack },
      },
    });
  } catch (e) {
    console.error("❌ Impossible d'écrire dans AuditLog:", e);
  }

  // Optionnel: tuer le process si tu veux forcer un redémarrage
  // process.exit(1);
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
