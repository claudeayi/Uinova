import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import { nanoid } from "nanoid";

// Middlewares maison
import { securityHeaders, apiLimiter } from "./middlewares/security";
import { errorHandler } from "./middlewares/errorHandler";

// Swagger
import { setupSwagger } from "./utils/swagger";

// Routes API
import authRoutes from "./routes/auth";
import projectRoutes from "./routes/projects";
import pageRoutes from "./routes/pages";
import exportRoutes from "./routes/exports";
import paymentRoutes from "./routes/payments";
import badgeRoutes from "./routes/badges";
import notificationRoutes from "./routes/notifications";
import adminRoutes from "./routes/admin";
import uploadRoutes from "./routes/upload";
import aiRoutes from "./routes/ai";

// ⚡ Nouveaux modules V3
import marketplaceRoutes from "./routes/marketplace";
import deployRoutes from "./routes/deploy";
import replayRoutes from "./routes/replay";
import monitoringRoutes from "./routes/monitoring";

// ---- Typage: ID de requête sur Express.Request
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

const app = express();
const isProd = process.env.NODE_ENV === "production";

// ---- Trust proxy (Nginx/Render/Heroku)
app.set("trust proxy", 1);

// ---- ID de requête + header pour traçabilité
app.use((req: Request, res: Response, next: NextFunction) => {
  req.id = (req.headers["x-request-id"] as string) || nanoid(12);
  res.setHeader("x-request-id", req.id);
  next();
});

// ---- Sécurité
app.use(
  helmet({
    // Désactivé par défaut pour éviter de bloquer Swagger/Socket.io.
    // Active une CSP stricte côté prod si besoin.
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(securityHeaders);

// ---- Compression
app.use(compression());

// ---- CORS (multi-origines via .env)
const corsEnv = process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || "*";
const allowedOrigins = corsEnv
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin:
      allowedOrigins.length === 1 && allowedOrigins[0] === "*" ? "*" : allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "x-request-id"],
    maxAge: 86400,
  })
);

// Préflight global
app.options("*", cors());

// ---- Parsers (limites configurables)
app.use(express.json({ limit: process.env.JSON_LIMIT || "2mb" }));
app.use(express.urlencoded({ extended: true, limit: process.env.URLENC_LIMIT || "2mb" }));

// ---- Logger HTTP
app.use(
  morgan(isProd ? "combined" : "dev", {
    skip: () => process.env.MORGAN_SKIP === "1",
  })
);

// ---- Rate limit global
app.use("/api", apiLimiter);

// ---- Fichiers statiques (uploads local)
app.use(
  "/uploads",
  express.static("uploads", {
    fallthrough: true,
    maxAge: "7d",
    etag: true,
  })
);

// ---- Health / Version
app.get("/healthz", (_req, res) => res.json({ ok: true, ts: Date.now() }));
app.get("/health", (_req, res) => res.json({ ok: true })); // alias simple
app.get("/version", (_req, res) =>
  res.json({
    name: process.env.APP_NAME || "UInova API",
    version: process.env.APP_VERSION || "1.0.0",
    env: process.env.NODE_ENV || "development",
  })
);

// ---- Routes API (core V2/V2.5)
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/pages", pageRoutes);
app.use("/api/exports", exportRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/badges", badgeRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/ai", aiRoutes);

// ---- Routes API V3
app.use("/api/marketplace", marketplaceRoutes); // ⚡ templates & achats
app.use("/api/deploy", deployRoutes);           // ⚡ déploiement infra
app.use("/api/replay", replayRoutes);           // ⚡ replays collaboratifs
app.use("/api/monitoring", monitoringRoutes);   // ⚡ metrics & logs

// ---- Swagger (UI + JSON)
setupSwagger(app);

// ---- 404 API propre
app.use("/api", (_req: Request, res: Response) => {
  res.status(404).json({ error: "NOT_FOUND", message: "Route API introuvable" });
});

// ---- Gestion JSON invalide
app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ error: "BAD_REQUEST", message: "JSON invalide" });
  }
  return next(err);
});

// ---- Error handler global
app.use((err: any, req: Request, res: Response, next: NextFunction) =>
  errorHandler(err, req, res, next)
);

export default app;
