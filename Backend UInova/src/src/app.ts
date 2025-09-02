import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import { nanoid } from "nanoid";
import client from "prom-client";

// Middlewares maison
import { securityHeaders, apiLimiter } from "./middlewares/security";
import { errorHandler } from "./middlewares/errorHandler";

// Utils
import { prisma } from "./utils/prisma";
import { setupSwagger } from "./utils/swagger";

// Routes API (core)
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

// Routes API (V3 existantes)
import marketplaceRoutes from "./routes/marketplace";
import deployRoutes from "./routes/deploy";
import replayRoutes from "./routes/replay";
import monitoringRoutes from "./routes/monitoring";

// 🚀 Nouvelles routes alignées frontend
import arRoutes from "./routes/ar";               // ARPreviewPage
import assistantRoutes from "./routes/assistant"; // AIAssistantPage
import templateRoutes from "./routes/templates";  // TemplatePage / Marketplace

// 🚀 Nouvelles routes backend révolutionnaires
import collabRoutes from "./routes/collab";       // Collaboration CRDT
import webhookRoutes from "./routes/webhooks";    // Event bus / webhooks

// ---- Typage Express.Request
declare global {
  namespace Express {
    interface Request {
      id?: string;
      startAt?: number;
      user?: { id: string; role: string }; // injecté par authenticate()
    }
  }
}

const app = express();
const isProd = process.env.NODE_ENV === "production";

/* ============================================================================
 *  CONFIGURATION DE BASE
 * ========================================================================== */
app.set("trust proxy", 1);

// ID de requête + horodatage
app.use((req: Request, res: Response, next: NextFunction) => {
  req.id = (req.headers["x-request-id"] as string) || nanoid(12);
  req.startAt = Date.now();
  res.setHeader("x-request-id", req.id);
  next();
});

// Sécurité
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(securityHeaders);

// Compression
app.use(compression());

// CORS
const corsEnv = process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || "*";
const allowedOrigins = corsEnv.split(",").map((s) => s.trim()).filter(Boolean);
app.use(
  cors({
    origin: allowedOrigins.length === 1 && allowedOrigins[0] === "*" ? "*" : allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "x-request-id"],
    maxAge: 86400,
  })
);
app.options("*", cors());

// Parsers
app.use(express.json({ limit: process.env.JSON_LIMIT || "5mb" }));
app.use(express.urlencoded({ extended: true, limit: process.env.URLENC_LIMIT || "5mb" }));

// Logger HTTP
app.use(
  morgan(isProd ? "combined" : "dev", {
    skip: () => process.env.MORGAN_SKIP === "1",
  })
);

// Limite globale API
app.use("/api", apiLimiter);

// Statics
app.use("/uploads", express.static("uploads", { fallthrough: true, maxAge: "7d", etag: true }));

/* ============================================================================
 *  PROMETHEUS METRICS
 * ========================================================================== */
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ prefix: "uinova_" });

const httpRequestDuration = new client.Histogram({
  name: "uinova_http_request_duration_ms",
  help: "Durée des requêtes HTTP (ms)",
  labelNames: ["method", "route", "status_code"],
});

app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer();
  res.on("finish", () => {
    end({ method: req.method, route: req.path, status_code: res.statusCode });
  });
  next();
});

// Endpoint Prometheus (technique)
app.get("/metrics", async (_req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});

/* ============================================================================
 *  HEALTHCHECKS
 * ========================================================================== */
app.get("/healthz", (_req, res) => res.json({ ok: true, ts: Date.now() }));
app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/version", (_req, res) =>
  res.json({
    name: process.env.APP_NAME || "UInova API",
    version: process.env.APP_VERSION || "3.0.0",
    env: process.env.NODE_ENV || "development",
  })
);

/* ============================================================================
 *  ROUTES API
 * ========================================================================== */
// Core
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

// V3 modules
app.use("/api/marketplace", marketplaceRoutes);
app.use("/api/deploy", deployRoutes);
app.use("/api/replay", replayRoutes);
app.use("/api/monitoring", monitoringRoutes);

// Nouvelles pages frontend
app.use("/api/ar", arRoutes);
app.use("/api/assistant", assistantRoutes);
app.use("/api/templates", templateRoutes);

// Nouvelles fonctionnalités backend
app.use("/api/collab", collabRoutes);
app.use("/api/webhooks", webhookRoutes);

/* ============================================================================
 *  SWAGGER
 * ========================================================================== */
setupSwagger(app);

/* ============================================================================
 *  AUDIT LOG (chaque requête API)
 * ========================================================================== */
app.use(async (req: Request, res: Response, next: NextFunction) => {
  res.on("finish", async () => {
    try {
      if (req.path.startsWith("/api")) {
        await prisma.auditLog.create({
          data: {
            userId: req.user?.id || null,
            action: `${req.method} ${req.path}`,
            metadata: {
              status: res.statusCode,
              requestId: req.id,
              durationMs: Date.now() - (req.startAt || Date.now()),
            },
          },
        });
      }
    } catch (e) {
      console.error("❌ AuditLog insert failed:", e);
    }
  });
  next();
});

/* ============================================================================
 *  404 & ERROR HANDLING
 * ========================================================================== */
app.use("/api", (_req: Request, res: Response) => {
  res.status(404).json({ error: "NOT_FOUND", message: "Route API introuvable" });
});

app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ error: "BAD_REQUEST", message: "JSON invalide" });
  }
  return next(err);
});

// Handler global
app.use((err: any, req: Request, res: Response, next: NextFunction) =>
  errorHandler(err, req, res, next)
);

/* ============================================================================
 *  PROCESS ERROR HANDLING
 * ========================================================================== */
process.on("unhandledRejection", (reason) => {
  console.error("🚨 UNHANDLED REJECTION:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("🚨 UNCAUGHT EXCEPTION:", err);
});

export default app;
