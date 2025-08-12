// src/utils/prisma.ts
import { PrismaClient } from "@prisma/client";

const isProd = process.env.NODE_ENV === "production";

// En dev, expose la même instance sur globalThis pour éviter les doublons avec hot-reload
declare global {
  // eslint-disable-next-line no-var
  var __PRISMA__: PrismaClient | undefined;
}

const logLevels: ("query" | "info" | "warn" | "error")[] = isProd
  ? ["warn", "error"]
  : (process.env.PRISMA_LOG?.split(",").map(l => l.trim() as any).filter(Boolean) ||
     ["query", "warn", "error"]);

const prisma =
  global.__PRISMA__ ??
  new PrismaClient({
    log: logLevels,
    // datasources: { db: { url: process.env.DATABASE_URL } }, // optionnel si tu veux overrider
  });

// Attache les listeners de log (utile en dev)
if (!isProd && logLevels.includes("query")) {
  // @ts-ignore
  prisma.$on("query", (e) => {
    // e: { query, params, duration, ... }
    // eslint-disable-next-line no-console
    console.log("[prisma:query]", e.query, e.params, `${e.duration}ms`);
  });
}
if (logLevels.includes("error")) {
  // @ts-ignore
  prisma.$on("error", (e) => console.error("[prisma:error]", e));
}
if (logLevels.includes("warn")) {
  // @ts-ignore
  prisma.$on("warn", (e) => console.warn("[prisma:warn]", e));
}

// Arrêt propre
const enableShutdownHooks = () => {
  const shutdown = async () => {
    try {
      await prisma.$disconnect();
      // eslint-disable-next-line no-console
      console.log("[prisma] disconnected");
    } catch (e) {
      console.error("[prisma] disconnect error", e);
    } finally {
      process.exit(0);
    }
  };
  process.once("beforeExit", () => prisma.$disconnect().catch(() => {}));
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
  process.once("SIGUSR2", shutdown); // nodemon
};

if (!isProd) {
  // conserver l'instance en dev
  global.__PRISMA__ = prisma;
  enableShutdownHooks();
}

export { prisma };
export default prisma;
