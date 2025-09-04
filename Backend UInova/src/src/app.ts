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
import { bullBoardAdapter } from "./utils/bullBoard";
import { emitEvent } from "./services/eventBus";

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
import marketplaceRoutes from "./routes/marketplace";
import deployRoutes from "./routes/deploy";
import replayRoutes from "./routes/replay";
import monitoringRoutes from "./routes/monitoring";

// 🚀 Nouvelles routes alignées frontend
import arRoutes from "./routes/ar";
import assistantRoutes from "./routes/assistant";
import templateRoutes from "./routes/templates";
import favoritesRoutes from "./routes/favorites";   // ✅ NEW
import purchasesRoutes from "./routes/purchases";   // ✅ NEW

// 🚀 Nouvelles routes backend
import collabRoutes from "./routes/collab";
import webhookRoutes from "./routes/webhooks";
import billingRoutes from "./routes/billing";
import emailTemplateRoutes from "./routes/emailTemplates";

// ---- Typage Express.Request
declare global {
  namespace Express {
    interface Request {
      id?: string;
      startAt?: number;
      correlationId?: string;
      lang?: string;
      orgId?: string;
      workspaceId?: string;
      user?: { id: string; role: string };
    }
  }
}

const app = express();
const isProd = process.env.NODE_ENV === "production";
const useJsonLogs = process.env.JSON_LOGS === "true";

/* ============================================================================
 *  CONFIGURATION DE BASE
 * ========================================================================== */
app.set("trust proxy", 1);

// ID + correlation ID + lang + multi-tenant
app.use((req: Request, res: Response, next: NextFunction) => {
  req.id = (req.headers["x-request-id"] as string) || nanoid(12);
  req.correlationId = (req.headers["x-correlation-id"] as string) || req.id;
  req.startAt = Date.now();
  req.lang = (req.headers["accept-language"] as string)?.split(",")[0] || "fr";
  req.orgId = (req.headers["x-org-id"] as string) || undefined;
  req.workspaceId = (req.headers["x-workspace-id"] as string) || undefined;

  res.setHeader("x-request-id", req.id);
  res.setHeader("x-correlation-id", req.correlationId);
  next();
});

// Mode maintenance
app.use((req, res, next) => {
  if (process.env.MAINTENANCE_MODE === "1") {
    emitEvent("system.maintenance", { path: req.path, ts: Date.now() });
    return res.status(503).json({
      error: "SERVICE_UNAVAILABLE",
      message:
        req.lang === "fr"
          ? "UInova est en maintenance, réessayez plus tard."
          : "UInova is under maintenance, please try again later.",
    });
  }
  next();
});

// Sécurité
app.use(
  helmet({
    contentSecurityPolicy: isProd ? { useDefaults: true } : false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: isProd,
    noSniff: true,
  })
);
app.use(securityHeaders);

// Compression
app.use(compression());

// CORS dynamique
const corsEnv = process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || "*";
const allowedOrigins = corsEnv.split(",").map((s) => s.trim()).filter(Boolean);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        return callback(null, origin || "*");
      }
      return callback(new Error("Not allowed by CORS"), origin);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "x-request-id",
      "x-correlation-id",
      "x-org-id",
      "x-workspace-id",
    ],
    maxAge: 86400,
  })
);
app.options("*", cors());

// Parsers
app.use(express.json({ limit: process.env.JSON_LIMIT || "10mb" }));
app.use(express.urlencoded({ extended: true, limit: process.env.URLENC_LIMIT || "10mb" }));

// Logger HTTP (support JSON logs)
if (useJsonLogs) {
  app.use(
    morgan((tokens, req, res) =>
      JSON.stringify({
        method: tokens.method(req, res),
        url: tokens.url(req, res),
        status: tokens.status(req, res),
        responseTime: tokens["response-time"](req, res),
        requestId: (req as Request).id,
        orgId: (req as Request).orgId,
        workspaceId: (req as Request).workspaceId,
      })
    )
  );
} else {
  app.use(morgan(isProd ? "combined" : "dev", { skip: () => process.env.MORGAN_SKIP === "1" }));
}

// Limite globale API
app.use("/api", apiLimiter);

// Statics sécurisés
app.use(
  "/uploads",
  express.static("uploads", { fallthrough: true, maxAge: "7d", etag: true, dotfiles: "ignore" })
);

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

app.use("/api/marketplace", marketplaceRoutes);
app.use("/api/deploy", deployRoutes);
app.use("/api/replay", replayRoutes);
app.use("/api/monitoring", monitoringRoutes);

// Alignement frontend
app.use("/api/ar", arRoutes);
app.use("/api/assistant", assistantRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api/favorites", favoritesRoutes);   // ✅ NEW
app.use("/api/purchases", purchasesRoutes);   // ✅ NEW
app.use("/api/billing", billingRoutes);

// Backend avancé
app.use("/api/collab", collabRoutes);
app.use("/api/webhooks", webhookRoutes);

// Admin-only
app.use("/api/admin/email-templates", emailTemplateRoutes);
app.use("/api/admin/jobs", bullBoardAdapter.getRouter());

/* ============================================================================
 *  SWAGGER
 * ========================================================================== */
setupSwagger(app);

/* ============================================================================
 *  AUDIT LOG + EVENT BUS
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
              correlationId: req.correlationId,
              durationMs: Date.now() - (req.startAt || Date.now()),
              ip: req.ip,
              ua: req.headers["user-agent"] || null,
              lang: req.lang,
              orgId: req.orgId,
              workspaceId: req.workspaceId,
            },
          },
        });

        emitEvent("api.request", {
          method: req.method,
          path: req.path,
          status: res.statusCode,
          userId: req.user?.id || null,
          correlationId: req.correlationId,
          orgId: req.orgId,
          workspaceId: req.workspaceId,
        });
      }
    } catch (e) {
      emitEvent("api.error", { error: (e as Error).message, path: req.path });
      console.error("❌ AuditLog insert failed:", e);
    }
  });
  next();
});

/* ============================================================================
 *  404 & ERROR HANDLING
 * ========================================================================== */
app.use("/api", (_req: Request, res: Response) => {
  res.status(404).json({
    error: "NOT_FOUND",
    message: res.req?.lang === "fr" ? "Route API introuvable" : "API route not found",
  });
});

// JSON invalide
app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({
      error: "BAD_REQUEST",
      message: _req.lang === "fr" ? "JSON invalide" : "Invalid JSON",
    });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({
      error: "PAYLOAD_TOO_LARGE",
      message: _req.lang === "fr" ? "Payload trop volumineux" : "Payload too large",
    });
  }
  return next(err);
});

app.use((err: any, req: Request, res: Response, next: NextFunction) =>
  errorHandler(err, req, res, next)
);

/* ============================================================================
 *  PROCESS ERROR HANDLING
 * ========================================================================== */
process.on("unhandledRejection", (reason) => {
  emitEvent("system.unhandledRejection", { reason });
  console.error("🚨 UNHANDLED REJECTION:", reason);
});
process.on("uncaughtException", (err) => {
  emitEvent("system.uncaughtException", { error: err.message });
  console.error("🚨 UNCAUGHT EXCEPTION:", err);
});

export default app;
