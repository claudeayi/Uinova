// src/services/collab.ts
import { Server, Socket } from "socket.io";
import { verifyToken, JWTPayload } from "../utils/jwt";

// (optionnel) branche un module policy si tu veux du RBAC serveur fin
// export async function canAccessProject(userId: string, projectId: string|number, need: "VIEW"|"EDIT") { ... }

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
  .map(s => s.trim())
  .filter(Boolean);

const roomKey = (projectId: string | number, pageId?: string | number) =>
  pageId === undefined ? `project:${projectId}` : `project:${projectId}:page:${pageId}`;

// ==== Rate limit simple par socket (token bucket) ====
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

// ==== Auth au handshake ====
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

// ==== (Optionnel) RBAC projet ====
async function ensureAccess(_userId: string, _projectId: string | number, _need: "VIEW" | "EDIT") {
  // Si tu as une policy serveur, vérifie ici :
  // const ok = await canAccessProject(userId, projectId, need);
  // if (!ok) throw new Error("FORBIDDEN");
  return;
}

// ==== API publique ====
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
      const size = (await io!.in(room).fetchSockets()).length;
      io!.to(room).emit("usersCount", size);
    }

    // Join d'une page
    socket.on("joinRoom", async ({ projectId, pageId }: { projectId: string | number; pageId?: string | number }) => {
      try {
        if (!socket.user) throw new Error("UNAUTHORIZED");
        if (!projectId) throw new Error("BAD_REQUEST");
        await ensureAccess(socket.user.id, projectId, "VIEW");

        // Quitter d'anciennes rooms project:
        for (const r of socket.rooms) if (r.startsWith("project:")) socket.leave(r);

        const pRoom = roomKey(projectId);
        const pgRoom = pageId !== undefined ? roomKey(projectId, pageId) : null;

        if (pgRoom) {
          const socketsInPage = await io!.in(pgRoom).fetchSockets();
          if (socketsInPage.length >= MAX_ROOM_SIZE) {
            return socket.emit("roomFull", { room: pgRoom, max: MAX_ROOM_SIZE });
          }
        }

        await socket.join(pRoom);
        await emitUsersCount(pRoom);
        if (pgRoom) {
          await socket.join(pgRoom);
          await emitUsersCount(pgRoom);
        }

        socket.emit("joined", { projectRoom: pRoom, pageRoom: pgRoom });
      } catch (e: any) {
        socket.emit("errorMessage", { code: e?.message || "JOIN_FAILED" });
      }
    });

    // Quit
    socket.on("leaveRoom", async ({ projectId, pageId }: { projectId: string | number; pageId?: string | number }) => {
      const pRoom = roomKey(projectId);
      const pgRoom = pageId !== undefined ? roomKey(projectId, pageId) : null;
      if (pgRoom) socket.leave(pgRoom);
      socket.leave(pRoom);
      if (pgRoom) await emitUsersCount(pgRoom);
      await emitUsersCount(pRoom);
    });

    // Update d'éléments (diff/ops)
    socket.on("updateElements", async (payload: {
      projectId: string | number;
      pageId: string | number;
      ops: any;              // patch JSON / CRDT ops
      version?: number;
    }) => {
      try {
        if (!rlUpdate()) return socket.emit("rateLimited", { event: "updateElements" });
        if (!socket.user) throw new Error("UNAUTHORIZED");
        const { projectId, pageId, ops, version } = payload || ({} as any);
        if (!projectId || pageId === undefined) throw new Error("BAD_REQUEST");
        await ensureAccess(socket.user.id, projectId, "EDIT");

        io!.to(roomKey(projectId, pageId)).except(socket.id).emit("updateElements", {
          projectId, pageId, ops, version, actor: socket.user.id,
        });
      } catch (e: any) {
        socket.emit("errorMessage", { code: e?.message || "UPDATE_FAILED" });
      }
    });

    // Curseur / sélection (présence fine)
    socket.on("cursor", (payload: {
      projectId: string | number; pageId: string | number;
      x: number; y: number; zoom?: number;
      selection?: string[]; color?: string;
    }) => {
      if (!rlCursor()) return socket.emit("rateLimited", { event: "cursor" });
      if (!socket.user) return;
      const { projectId, pageId, ...rest } = payload || ({} as any);
      if (!projectId || pageId === undefined) return;
      socket.to(roomKey(projectId, pageId)).emit("cursor", { userId: socket.user.id, ...rest });
    });

    // Métadonnées (locks, titre, etc.)
    socket.on("pageMeta", (payload: {
      projectId: string | number; pageId: string | number;
      locks?: Record<string, string>; title?: string;
    }) => {
      if (!rlMeta()) return socket.emit("rateLimited", { event: "pageMeta" });
      if (!socket.user) return;
      const { projectId, pageId, ...rest } = payload || ({} as any);
      if (!projectId || pageId === undefined) return;
      socket.to(roomKey(projectId, pageId)).emit("pageMeta", { ...rest, actor: socket.user.id });
    });

    // Heartbeat
    socket.on("pingMe", () => socket.emit("pongMe", { t: Date.now() }));

    socket.on("disconnect", async () => {
      try {
        const rooms = [...socket.rooms].filter(r => r.startsWith("project:"));
        for (const r of rooms) await emitUsersCount(r);
      } catch {/* ignore */}
    });
  });

  return io;
}

// ==== Helpers pour émettre depuis tes controllers ====
export function emitToProject(projectId: string | number, event: string, payload: any) {
  io?.to(roomKey(projectId)).emit(event, payload);
}
export function emitToPage(projectId: string | number, pageId: string | number, event: string, payload: any) {
  io?.to(roomKey(projectId, pageId)).emit(event, payload);
}
