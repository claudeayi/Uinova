import http from "node:http";
import app from "./app";
import { setupCollabSocket, io as collabIO } from "./services/collab";
import collabRoutes from "./routes/collabRoutes";
import collabReplayRoutes from "./routes/collabReplayRoutes"; // 🔹 nouveau
import { prisma } from "./utils/prisma";
import { initScheduler } from "./utils/scheduler";
import { collectBusinessMetrics } from "./services/businessMetrics";
import { collectDeploymentMetrics } from "./services/deploymentMetrics";

// ======================
// CONFIG
// ======================
const HOST = process.env.HOST || "0.0.0.0";
const PORT = normalizePort(process.env.PORT || "5000");

// ======================
// API EXTRA ROUTES
// ======================
app.use("/api/collab", collabRoutes);
app.use("/api/collab/replay", collabReplayRoutes); // 🔹 nouveau

// Expose le port à Express (utile pour middlewares)
app.set("port", PORT);

// ======================
// HTTP + SOCKET.IO SERVER
// ======================
const server = http.createServer(app);

// Durées recommandées (Node 18+) pour éviter connexions bloquées
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

// Collaboration temps réel (Socket.io + Y.js CRDT)
setupCollabSocket(server);

// ======================
// START SERVER
// ======================
server.listen(PORT as number, HOST, () => {
  const base =
    process.env.API_BASE_URL ||
    `http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}`;
  console.log(`\x1b[32m✅ UInova API prête sur ${base}\x1b[0m`);
  console.log(`📚 Docs: ${base.replace(/\/+$/, "")}/api-docs`);

  // Scheduler (auto-scaling, retry, rollback…)
  initScheduler();
});

// ======================
// SERVER EVENTS
// ======================
server.on("error", onError);

// Monitoring connexions actives
server.on("connection", () => {
  const count = collabIO?.engine?.clientsCount || 0;
  console.log(`🌐 Connexion TCP | Sockets actifs: ${count}`);
});

// ======================
// GRACEFUL SHUTDOWN
// ======================
["SIGINT", "SIGTERM", "SIGUSR2"].forEach((sig) => {
  process.once(sig as NodeJS.Signals, async () => {
    console.log(`\n⏹️  Signal ${sig} reçu: arrêt en cours...`);
    try {
      // Ferme Socket.io
      try {
        collabIO?.close?.();
      } catch {}

      // Ferme serveur HTTP
      await new Promise<void>((resolve) => server.close(() => resolve()));

      // Ferme Prisma proprement
      await prisma.$disconnect();

      console.log("👋 Serveur arrêté proprement.");
      process.exit(0);
    } catch (e) {
      console.error("❌ Erreur à l'arrêt:", e);
      process.exit(1);
    }
  });
});

// ======================
// GLOBAL ERROR HANDLING
// ======================
process.on("unhandledRejection", async (reason: any) => {
  console.error("🚨 UNHANDLED REJECTION:", reason);
  try {
    await prisma.auditLog.create({
      data: {
        action: "unhandledRejection",
        metadata: { reason: String(reason) },
      },
    });
  } catch (e) {
    console.error("❌ AuditLog write failed:", e);
  }
});

process.on("uncaughtException", async (err: Error) => {
  console.error("🚨 UNCAUGHT EXCEPTION:", err);
  try {
    await prisma.auditLog.create({
      data: {
        action: "uncaughtException",
        metadata: { message: err.message, stack: err.stack },
      },
    });
  } catch (e) {
    console.error("❌ AuditLog write failed:", e);
  }
  // process.exit(1); // optionnel si tu veux un restart auto
});

// ======================
// HELPERS
// ======================
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

// ======================
// PROMETHEUS BUSINESS + DEPLOY METRICS
// ======================
// Hook sur collectDefaultMetrics déjà dans app.ts
setInterval(async () => {
  try {
    await collectBusinessMetrics();
    await collectDeploymentMetrics();
  } catch (err) {
    console.error("❌ Erreur collecte métriques:", err);
  }
}, 30_000);
