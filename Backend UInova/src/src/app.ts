// src/app.ts
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import { nanoid } from "nanoid";

import { securityHeaders, apiLimiter } from "./middlewares/security";
import { setupSwagger } from "./utils/swagger";
import { errorHandler } from "./middlewares/errorHandler";

// Routes
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

const app = express();
const isProd = process.env.NODE_ENV === "production";

// --- Trust proxy (nécessaire si derrière Nginx/Heroku/Render)
app.set("trust proxy", 1);

// --- Request ID pour traçabilité
app.use((req: any, _res, next) => {
  req.id = req.headers["x-request-id"] || nanoid(12);
  next();
});

// --- Sécurité (Helmet + nos headers)
app.use(
  helmet({
    contentSecurityPolicy: false, // désactive CSP par défaut (à définir si nécessaire pour Swagger)
  })
);
app.use(securityHeaders);

// --- Compression
app.use(compression());

// --- CORS piloté par .env
const allowed = (process.env.CORS_ORIGINS || "*")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: allowed.length === 1 && allowed[0] === "*" ? "*" : allowed,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    maxAge: 86400,
  })
);

// --- Parsers (limites configurables)
app.use(express.json({ limit: process.env.JSON_LIMIT || "2mb" }));
app.use(express.urlencoded({ extended: true, limit: process.env.URLENC_LIMIT || "2mb" }));

// --- Logger HTTP (dev friendly)
app.use(
  morgan(isProd ? "combined" : "dev", {
    skip: () => process.env.MORGAN_SKIP === "1",
  })
);

// --- Rate limit global API
app.use("/api", apiLimiter);

// --- Static uploads (LOCAL provider)
app.use("/uploads", express.static("uploads", { fallthrough: true, maxAge: "7d", etag: true }));

// --- Health & version
app.get("/healthz", (_req, res) => res.json({ ok: true, ts: Date.now() }));
app.get("/version", (_req, res) =>
  res.json({
    name: process.env.APP_NAME || "UInova API",
    version: process.env.APP_VERSION || "1.0.0",
    env: process.env.NODE_ENV || "development",
  })
);

// --- Routes API
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

// --- Swagger (UI + JSON)
setupSwagger(app);

// --- 404 API propre
app.use("/api", (_req: Request, res: Response) => {
  res.status(404).json({ error: "NOT_FOUND", message: "Route API introuvable" });
});

// --- Error handler global
app.use((err: any, req: Request, res: Response, next: NextFunction) => errorHandler(err, req, res, next));

export default app;
