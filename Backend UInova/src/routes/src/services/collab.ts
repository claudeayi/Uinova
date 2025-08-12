// src/services/collab.ts
import { Server, Socket } from "socket.io";
import { verifyToken } from "../utils/jwt";
import * as policy from "./policy"; // optionnel: policy.canAccessProject(userId, projectId, "VIEW"|"EDIT")

// (optionnel) Redis adapter pour scale horizontal
// import { createAdapter } from "@socket.io/redis-adapter";
// import { createClient } from "redis";

type AppRole = "USER" | "PREMIUM" | "ADMIN";
type AuthedUser = { id: string; email?: string; role: AppRole };

declare module "socket.io" {
  interface Socket {
    user?: AuthedUser;
  }
}

// ====== State ======
export let io: Server | null = null;

// Utils
const roomKey = (projectId: string | number, pageId?: string | number) =>
  pageId !== undefined ? `project:${projectId}:page:${pageId}` : `project:${projectId}`;

const MAX_ROOM_SIZE = Number(process.env.COLLAB_MAX_ROOM || 200);

// Simple rate limiter par socket (token bucket)
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

// Auth middleware au handshake
function authMiddleware(socket: Socket, next: (err?: any) => void) {
  try {
    const raw =
      (socket.handshake.auth && (socket.handshake.auth as any).token) ||
      (socket.handshake.headers["authorization"] as string) ||
      (socket.handshake.query?.token as string) ||
      "";

    const token = raw.startsWith("Bearer ") ? raw.slice(7) : raw;
    if (!token) return next(new Error("UNAUTHORIZED: missing token"));

    const payload = verifyToken(token) as any;
    const id = String(payload.sub ?? payload.id);
    if (!id) return next(new Error("UNAUTHORIZED: bad token"));

    const role = (payload.role || "USER").toUpperCase();
    socket.user = { id, email: payload.email, role } as AuthedUser;
    next();
  } catch (e) {
    next(new Error("UNAUTHORIZED: invalid token"));
  }
}

// Vérifie l’accès projet/page (RBAC)
async function ensureAccess(userId: string, projectId: string | number, need: "VIEW" | "EDIT") {
  if (policy?.canAccessProject) {
    const ok = await policy.canAccessProject(userId, projectId, need);
    if (!ok) throw new Error("FORBIDDEN");
    return;
  }
  // fallback permissif: laisser VIEW, EDIT contrôlé par front/controllers si pas de policy
  return;
}

// ====== Setup principal ======
export function setupCollabSocket(server: any) {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL?.split(",") || "*",
      credentials: true,
    },
    pingTimeout: 20_000,
    pingInterval: 10_000,
    transports: ["websocket", "polling"],
  });

  // Optionnel: Redis adapter pour scale
  // const pubClient = createClient({ url: process.env.REDIS_URL });
  // const subClient = pubClient.duplicate();
  // await pubClient.connect(); await subClient.connect();
  // io.adapter(createAdapter(pubClient, subClient));

  io.use(authMiddleware);

  io.on("connection", (socket) => {
    const rlUpdate = makeRateLimit(30, 50);
    const rlCursor = makeRateLimit(60, 80);
    const rlMeta = makeRateLimit(20, 30);

    // Utilitaire: broadcast usersCount
    async function emitUsersCount(room: string) {
      const size = (await io!.in(room).fetchSockets()).length;
      io!.to(room).emit("usersCount", size);
    }

    // Join rooms
    socket.on("joinRoom", async (payload: { projectId: string | number; pageId?: string | number }) => {
      try {
        if (!socket.user) throw new Error("UNAUTHORIZED");
        const { projectId, pageId } = payload || {};
        if (!projectId) throw new Error("BAD_REQUEST");

        // RBAC (vue)
        await ensureAccess(socket.user.id, projectId, "VIEW");

        const projectRoom = roomKey(projectId);
        const pageRoom = pageId !== undefined ? roomKey(projectId, pageId) : null;

        // Taille de room
        const socketsInPage = pageRoom ? await io!.in(pageRoom).fetchSockets() : [];
        if (pageRoom && socketsInPage.length >= MAX_ROOM_SIZE) {
          return socket.emit("roomFull", { room: pageRoom, max: MAX_ROOM_SIZE });
        }

        // Quitter rooms précédentes (si besoin)
        for (const r of socket.rooms) {
          if (r.startsWith("project:")) socket.leave(r);
        }

        await socket.join(projectRoom);
        await emitUsersCount(projectRoom);

        if (pageRoom) {
          await socket.join(pageRoom);
          await emitUsersCount(pageRoom);
        }

        socket.emit("joined", { projectRoom, pageRoom });
      } catch (e: any) {
        socket.emit("errorMessage", { code: e?.message || "JOIN_FAILED" });
      }
    });

    // Quit room
    socket.on("leaveRoom", async ({ projectId, pageId }: { projectId: string | number; pageId?: string | number }) => {
      const projectRoom = roomKey(projectId);
      const pageRoom = pageId !== undefined ? roomKey(projectId, pageId) : null;

      if (pageRoom) socket.leave(pageRoom);
      socket.leave(projectRoom);

      if (io) {
        if (pageRoom) await emitUsersCount(pageRoom);
        await emitUsersCount(projectRoom);
      }
    });

    // Updates d’éléments (diffs) — EDIT nécessite droit
    socket.on("updateElements", async (payload: {
      projectId: string | number;
      pageId: string | number;
      ops: any;                    // patch/diff JSON
      version?: number;            // pour résolution OT/CRDT côté front
    }) => {
      try {
        if (!rlUpdate()) return socket.emit("rateLimited", { event: "updateElements" });
        if (!socket.user) throw new Error("UNAUTHORIZED");
        const { projectId, pageId, ops, version } = payload || {};
        if (!projectId || pageId === undefined) throw new Error("BAD_REQUEST");

        await ensureAccess(socket.user.id, projectId, "EDIT");

        const room = roomKey(projectId, pageId);
        // Émet aux autres sockets de la page
        socket.to(room).emit("updateElements", {
          projectId,
          pageId,
          ops,
          version: typeof version === "number" ? version : undefined,
          actor: socket.user.id,
        });
      } catch (e: any) {
        socket.emit("errorMessage", { code: e?.message || "UPDATE_FAILED" });
      }
    });

    // Cursors & selection (présence fine)
    socket.on("cursor", (payload: {
      projectId: string | number;
      pageId: string | number;
      x: number; y: number; zoom?: number;
      selection?: string[]; // ids d’éléments
      color?: string;
    }) => {
      if (!rlCursor()) return socket.emit("rateLimited", { event: "cursor" });
      if (!socket.user) return;
      const { projectId, pageId, ...rest } = payload || ({} as any);
      if (!projectId || pageId === undefined) return;

      const room = roomKey(projectId, pageId);
      socket.to(room).emit("cursor", { userId: socket.user.id, ...rest });
    });

    // Métadonnées (locks, page title, etc.)
    socket.on("pageMeta", async (payload: {
      projectId: string | number;
      pageId: string | number;
      locks?: { [elementId: string]: string /* userId */ };
      title?: string;
    }) => {
      if (!rlMeta()) return socket.emit("rateLimited", { event: "pageMeta" });
      if (!socket.user) return;
      const { projectId, pageId, ...rest } = payload || ({} as any);
      if (!projectId || pageId === undefined) return;

      const room = roomKey(projectId, pageId);
      socket.to(room).emit("pageMeta", { ...rest, actor: socket.user.id });
    });

    // Heartbeat (optionnel côté front)
    socket.on("pingMe", () => socket.emit("pongMe", { t: Date.now() }));

    socket.on("disconnect", async () => {
      // Met à jour les compteurs dans les rooms où il était
      try {
        const promises: Promise<any>[] = [];
        for (const r of socket.rooms) {
          if (r.startsWith("project:")) promises.push(io!.in(r).fetchSockets().then(s => io!.to(r).emit("usersCount", s.length)));
        }
        await Promise.all(promises);
      } catch {/* ignore */}
    });
  });

  return io;
}

// ====== Emission utilitaire depuis d’autres modules ======
export function emitToProject(projectId: string | number, event: string, payload: any) {
  if (!io) return;
  io.to(roomKey(projectId)).emit(event, payload);
}
export function emitToPage(projectId: string | number, pageId: string | number, event: string, payload: any) {
  if (!io) return;
  io.to(roomKey(projectId, pageId)).emit(event, payload);
}
