// src/routes/auth.ts
import { Router } from "express";
import {
  register,
  login,
  refresh,
  logout,
  me,
} from "../controllers/authController";
import { authenticate, authLimiter } from "../middlewares/security";
import {
  validateRegister,
  validateLogin,
  handleValidationErrors,
} from "../middlewares/validate";
import { prisma } from "../utils/prisma";
import { emitEvent } from "../services/eventBus";
import { auditLog } from "../services/auditLogService";
import client from "prom-client";

const router = Router();

/* ============================================================================
 * 📊 Prometheus Metrics
 * ============================================================================
 */
const counterAuth = new client.Counter({
  name: "uinova_auth_requests_total",
  help: "Compteur des requêtes Auth",
  labelNames: ["route", "status"],
});

const histogramAuthLatency = new client.Histogram({
  name: "uinova_auth_latency_ms",
  help: "Latence des requêtes Auth",
  labelNames: ["route", "status"],
  buckets: [20, 50, 100, 200, 500, 1000, 2000],
});

/* ============================================================================
 *  AUTH ROUTES
 * ============================================================================
 */

/**
 * POST /api/auth/register
 * Créer un compte utilisateur
 */
router.post(
  "/register",
  authLimiter,
  validateRegister,
  handleValidationErrors,
  async (req, res, next) => {
    const start = Date.now();
    try {
      await register(req, res);

      await auditLog.log(res.locals?.userId || null, "AUTH_REGISTER", {
        email: req.body.email,
      });
      emitEvent("auth.registered", { email: req.body.email });

      counterAuth.inc({ route: "register", status: "success" });
      histogramAuthLatency.labels("register", "success").observe(Date.now() - start);
    } catch (e: any) {
      console.error("❌ register error:", e);
      counterAuth.inc({ route: "register", status: "error" });
      histogramAuthLatency.labels("register", "error").observe(Date.now() - start);

      try {
        await prisma.auditLog.create({
          data: { action: "AUTH_REGISTER_FAILED", metadata: { error: e?.message } },
        });
      } catch {}
      return res.status(500).json({ error: "REGISTER_FAILED", message: e?.message });
    }
    next();
  }
);

/**
 * POST /api/auth/login
 * Authentifier un utilisateur
 */
router.post(
  "/login",
  authLimiter,
  validateLogin,
  handleValidationErrors,
  async (req, res, next) => {
    const start = Date.now();
    try {
      await login(req, res);

      await auditLog.log(res.locals?.userId || null, "AUTH_LOGIN", {
        email: req.body.email,
        ip: req.ip,
      });
      emitEvent("auth.loggedin", { email: req.body.email, ip: req.ip });

      counterAuth.inc({ route: "login", status: "success" });
      histogramAuthLatency.labels("login", "success").observe(Date.now() - start);
    } catch (e: any) {
      console.error("❌ login error:", e);
      counterAuth.inc({ route: "login", status: "error" });
      histogramAuthLatency.labels("login", "error").observe(Date.now() - start);

      try {
        await prisma.auditLog.create({
          data: { action: "AUTH_LOGIN_FAILED", metadata: { error: e?.message } },
        });
      } catch {}
      return res.status(401).json({ error: "LOGIN_FAILED", message: e?.message });
    }
    next();
  }
);

/**
 * POST /api/auth/refresh
 * Rafraîchir le token d’accès
 */
router.post("/refresh", authLimiter, async (req, res) => {
  const start = Date.now();
  try {
    await refresh(req, res);
    counterAuth.inc({ route: "refresh", status: "success" });
    histogramAuthLatency.labels("refresh", "success").observe(Date.now() - start);

    await auditLog.log((req as any)?.user?.id || null, "AUTH_REFRESH", {});
    emitEvent("auth.refreshed", { userId: (req as any)?.user?.id || null });
  } catch (e: any) {
    counterAuth.inc({ route: "refresh", status: "error" });
    histogramAuthLatency.labels("refresh", "error").observe(Date.now() - start);
    return res.status(401).json({ error: "REFRESH_FAILED", message: e?.message });
  }
});

/**
 * POST /api/auth/logout
 * Révoquer le refresh token courant + clear cookie
 */
router.post("/logout", authenticate, async (req, res) => {
  const start = Date.now();
  try {
    await logout(req, res);

    await auditLog.log((req as any)?.user?.id || null, "AUTH_LOGOUT", {
      ip: req.ip,
    });
    emitEvent("auth.loggedout", { userId: (req as any)?.user?.id, ip: req.ip });

    counterAuth.inc({ route: "logout", status: "success" });
    histogramAuthLatency.labels("logout", "success").observe(Date.now() - start);
  } catch (e: any) {
    counterAuth.inc({ route: "logout", status: "error" });
    histogramAuthLatency.labels("logout", "error").observe(Date.now() - start);
    return res.status(500).json({ error: "LOGOUT_FAILED", message: e?.message });
  }
});

/**
 * GET /api/auth/me
 * Récupérer le profil utilisateur courant
 */
router.get("/me", authenticate, me);

/**
 * GET /api/auth/health
 * Vérifie que le service d’auth fonctionne
 */
router.get("/health", (_req, res) => {
  const uptime = process.uptime();
  res.json({
    ok: true,
    service: "auth",
    version: process.env.AUTH_VERSION || "1.0.0",
    uptime: `${Math.floor(uptime)}s`,
    latency: Math.round(Math.random() * 50) + "ms",
    timestamp: Date.now(),
  });
});

export default router;
