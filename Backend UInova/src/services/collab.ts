// src/services/collabService.ts
import { Server, Socket } from "socket.io";
import { verifyToken, JWTPayload } from "../utils/jwt";
import { prisma } from "../utils/prisma";
import { logger } from "../utils/logger";
import client from "prom-client";
import { auditLog } from "./auditLogService";
import { emitEvent } from "./eventBus";
import { z } from "zod";

type AppRole = "user" | "premium" | "admin";
type AuthedUser = { id: string; email?: string; role: AppRole };

declare module "socket.io" {
  interface Socket {
    user?: AuthedUser;
  }
}

export let io: Server | null = null;

const MAX_ROOM_SIZE = Number(process.env.COLLAB_MAX_ROOM || 200);
const CORS_ORIGINS = (process.env.CORS_ORIGINS || "*")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const roomKey = (projectId: string | number, pageId?: string | number) =>
  pageId === undefined ? `project:${projectId}` : `project:${projectId}:page:${pageId}`;

/* ============================================================================
 * 📊 METRICS Prometheus
 * ============================================================================
 */
const gaugeUsersConnected = new client.Gauge({
  name: "uinova_collab_users_connected",
  help: "Nombre d’utilisateurs connectés au collab",
});

const gaugeRoomsActive = new client.Gauge({
  name: "uinova_collab_rooms_active",
  help: "Nombre de rooms actives (projets/pages)",
});

const counterEvents = new client.Counter({
  name: "uinova_collab_events_total",
  help: "Nombre d’événements collaboratifs traités",
  labelNames: ["event", "status"],
});

const histogramLatency = new client.Histogram({
  name: "uinova_collab_event_latency_ms",
  help: "Latence des événements collaboratifs",
  labelNames: ["event"],
  buckets: [10, 50, 100, 200, 500, 1000, 2000],
});

/* ============================================================================
 * ⏳ Rate limiting simple par socket
 * ============================================================================
 */
function makeRateLimit(perSec = 30, burst = 60) {
  let tokens = burst;
  let last = Date.now();
  return () => {
    const now = Date.now();
    tokens = Math.min(burst, tokens + ((now - last) / 1000) * perSec);
    last = now;
    if (tokens < 1) return false;
    tokens -= 1;
    return true;
  };
}

/* ============================================================================
 * 🔐 Auth JWT au handshake
 * ============================================================================
 */
function authMiddleware(socket: Socket, next: (err?: any) => void) {
  try {
    const raw =
      (socket.handshake.auth as any)?.token ||
      (socket.handshake.headers["authorization"] as string) ||
      (socket.handshake.query?.token as string) ||
      "";

    const token = raw?.startsWith("Bearer ") ? raw.slice(7) : raw;
    if (!token) return next(new Error("UNAUTHORIZED: missing token"));

    const payload = verifyToken(token) as JWTPayload | null;
    if (!payload?.id) return next(new Error("UNAUTHORIZED: invalid token"));

    socket.user = {
      id: String((payload as any).sub ?? payload.id),
      email: payload.email,
      role: (payload.role || "user") as AppRole,
    };
    next();
  } catch {
    next(new Error("UNAUTHORIZED"));
  }
}

/* ============================================================================
 * (Optionnel) RBAC projet
 * ============================================================================
 */
async function ensureAccess(_userId: string, _projectId: string | number, _need: "VIEW" | "EDIT") {
  // ⚡ Hook RBAC : à implémenter (organisation, rôles, partage projet…)
  return;
}

/* ============================================================================
 * Validation Zod des payloads
 * ============================================================================
 */
const updateElementsSchema = z.object({
  projectId: z.union([z.string(), z.number()]),
  pageId: z.union([z.string(), z.number()]),
  ops: z.any(),
  version: z.number().optional(),
});

const cursorSchema = z.object({
  projectId: z.union([z.string(), z.number()]),
  pageId: z.union([z.string(), z.number()]),
  x: z.number(),
  y: z.number(),
  zoom: z.number().optional(),
  selection: z.array(z.string()).optional(),
  color: z.string().optional(),
});

const pageMetaSchema = z.object({
  projectId: z.union([z.string(), z.number()]),
  pageId: z.union([z.string(), z.number()]),
  locks: z.record(z.string()).optional(),
  title: z.string().optional(),
});

/* ============================================================================
 * Présence : liste des users connectés par room
 * ============================================================================
 */
async function getUsersInRoom(room: string) {
  const sockets = await io!.in(room).fetchSockets();
  return sockets.map((s) => s.user);
}

/* ============================================================================
 * 🚀 Setup Socket.io
 * ============================================================================
 */
export function setupCollabSocket(server: any) {
  io = new Server(server, {
    cors: {
      origin: CORS_ORIGINS.length === 1 && CORS_ORIGINS[0] === "*" ? "*" : CORS_ORIGINS,
      credentials: true,
    },
    transports: ["websocket", "polling"],
    pingInterval: 10_000,
    pingTimeout: 20_000,
  });

  io.use(authMiddleware);

  io.on("connection", (socket) => {
    const rlUpdate = makeRateLimit(30, 60);
    const rlCursor = makeRateLimit(60, 120);
    const rlMeta = makeRateLimit(20, 40);

    async function emitUsersCount(room: string) {
      const users = await getUsersInRoom(room);
      io!.to(room).emit("usersUpdate", { count: users.length, users });

      gaugeUsersConnected.set(io!.engine.clientsCount);
      const rooms = await io!.allSockets();
      gaugeRoomsActive.set(rooms.size);
    }

    /* -----------------------------
     * Join Room
     * ----------------------------- */
    socket.on("joinRoom", async ({ projectId, pageId }) => {
      const start = Date.now();
      try {
        if (!socket.user) throw new Error("UNAUTHORIZED");
        if (!projectId) throw new Error("BAD_REQUEST");
        await ensureAccess(socket.user.id, projectId, "VIEW");

        // Quitter rooms précédentes
        for (const r of socket.rooms) if (r.startsWith("project:")) socket.leave(r);

        const pRoom = roomKey(projectId);
        const pgRoom = pageId !== undefined ? roomKey(projectId, pageId) : null;

        if (pgRoom) {
          const socketsInPage = await io!.in(pgRoom).fetchSockets();
          if (socketsInPage.length >= MAX_ROOM_SIZE) {
            return socket.emit("errorMessage", { code: "ROOM_FULL", room: pgRoom, max: MAX_ROOM_SIZE });
          }
        }

        await socket.join(pRoom);
        await emitUsersCount(pRoom);
        if (pgRoom) {
          await socket.join(pgRoom);
          await emitUsersCount(pgRoom);
        }

        socket.emit("joined", { projectRoom: pRoom, pageRoom: pgRoom });

        await auditLog.log(socket.user.id, "COLLAB_JOIN", { projectId, pageId });
        emitEvent("collab.join", { userId: socket.user.id, projectId, pageId });

        logger.info(`👥 User ${socket.user.id} joined ${pRoom}${pgRoom ? " / " + pgRoom : ""}`);
        counterEvents.inc({ event: "joinRoom", status: "success" });
      } catch (e: any) {
        socket.emit("errorMessage", { code: e?.message || "JOIN_FAILED" });
        counterEvents.inc({ event: "joinRoom", status: "error" });
      } finally {
        histogramLatency.observe({ event: "joinRoom" }, Date.now() - start);
      }
    });

    /* -----------------------------
     * Update Elements
     * ----------------------------- */
    socket.on("updateElements", async (payload) => {
      const start = Date.now();
      try {
        if (!rlUpdate()) return socket.emit("rateLimited", { event: "updateElements" });
        if (!socket.user) throw new Error("UNAUTHORIZED");

        const parsed = updateElementsSchema.parse(payload);
        await ensureAccess(socket.user.id, parsed.projectId, "EDIT");

        io!.to(roomKey(parsed.projectId, parsed.pageId))
          .except(socket.id)
          .emit("updateElements", { ...parsed, actor: socket.user.id });

        await prisma.collabHistory.create({
          data: { projectId: String(parsed.projectId), userId: socket.user.id, changes: parsed.ops },
        });

        await auditLog.log(socket.user.id, "COLLAB_UPDATE", parsed);
        emitEvent("collab.update", { userId: socket.user.id, ...parsed });

        counterEvents.inc({ event: "updateElements", status: "success" });
      } catch (e: any) {
        socket.emit("errorMessage", { code: e?.message || "UPDATE_FAILED" });
        counterEvents.inc({ event: "updateElements", status: "error" });
      } finally {
        histogramLatency.observe({ event: "updateElements" }, Date.now() - start);
      }
    });

    /* -----------------------------
     * Cursor
     * ----------------------------- */
    socket.on("cursor", (payload) => {
      const start = Date.now();
      try {
        if (!rlCursor()) return socket.emit("rateLimited", { event: "cursor" });
        if (!socket.user) return;

        const parsed = cursorSchema.parse(payload);
        socket.to(roomKey(parsed.projectId, parsed.pageId)).emit("cursor", { userId: socket.user.id, ...parsed });

        counterEvents.inc({ event: "cursor", status: "success" });
      } catch {
        counterEvents.inc({ event: "cursor", status: "error" });
      } finally {
        histogramLatency.observe({ event: "cursor" }, Date.now() - start);
      }
    });

    /* -----------------------------
     * Page Meta
     * ----------------------------- */
    socket.on("pageMeta", (payload) => {
      const start = Date.now();
      try {
        if (!rlMeta()) return socket.emit("rateLimited", { event: "pageMeta" });
        if (!socket.user) return;

        const parsed = pageMetaSchema.parse(payload);
        socket.to(roomKey(parsed.projectId, parsed.pageId)).emit("pageMeta", { ...parsed, actor: socket.user.id });

        counterEvents.inc({ event: "pageMeta", status: "success" });
      } catch {
        counterEvents.inc({ event: "pageMeta", status: "error" });
      } finally {
        histogramLatency.observe({ event: "pageMeta" }, Date.now() - start);
      }
    });

    /* -----------------------------
     * Heartbeat & Disconnect
     * ----------------------------- */
    socket.on("pingMe", () => socket.emit("pongMe", { t: Date.now() }));

    socket.on("disconnect", async () => {
      try {
        const rooms = [...socket.rooms].filter((r) => r.startsWith("project:"));
        for (const r of rooms) await emitUsersCount(r);

        logger.info(`⚡ User ${socket.user?.id} disconnected (${socket.id})`);
        gaugeUsersConnected.set(io!.engine.clientsCount);

        emitEvent("collab.disconnect", { userId: socket.user?.id });
      } catch { /* ignore */ }
    });
  });

  return io;
}

/* ============================================================================
 * Helpers externes
 * ============================================================================
 */
export function emitToProject(projectId: string | number, event: string, payload: any) {
  io?.to(roomKey(projectId)).emit(event, payload);
}
export function emitToPage(projectId: string | number, pageId: string | number, event: string, payload: any) {
  io?.to(roomKey(projectId, pageId)).emit(event, payload);
}
export function emitToUser(userId: string, event: string, payload: any) {
  io?.sockets.sockets.forEach((s) => {
    if (s.user?.id === userId) s.emit(event, payload);
  });
}

/* ============================================================================
 * Graceful shutdown
 * ============================================================================
 */
export async function shutdownCollab() {
  if (io) {
    await io.close();
    io = null;
    logger.info("🛑 Collab service stopped");
  }
}
