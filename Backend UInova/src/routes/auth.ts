// src/routes/auth.ts
import { Router } from "express";
import {
  register,
  login,
  refresh,
  logout,
  me,
} from "../controllers/authController";
import { authenticate } from "../middlewares/security";
import {
  validateRegister,
  validateLogin,
  handleValidationErrors,
} from "../middlewares/validate";
import { authLimiter } from "../middlewares/security";
import { body } from "express-validator";
import { prisma } from "../utils/prisma";

const router = Router();

/* ============================================================================
 *  AUTH ROUTES
 *  Flux complet : Register → Login → Refresh → Logout → Me
 * ========================================================================== */

/**
 * POST /api/auth/register
 * Créer un compte utilisateur
 * Body: { email, password, displayName? }
 * Response: { accessToken, user } + cookie refresh httpOnly
 */
router.post(
  "/register",
  authLimiter,
  validateRegister,
  handleValidationErrors,
  async (req, res, next) => {
    await register(req, res);
    // 🔎 Audit (si activé)
    try {
      await prisma.auditLog.create({
        data: {
          userId: res.locals?.userId || null,
          action: "AUTH_REGISTER",
          metadata: { email: req.body.email },
        },
      });
    } catch (e) {
      console.warn("Audit log register failed:", e);
    }
    next;
  }
);

/**
 * POST /api/auth/login
 * Authentifier un utilisateur
 * Body: { email, password }
 * Response: { accessToken, user } + cookie refresh httpOnly
 */
router.post(
  "/login",
  authLimiter,
  validateLogin,
  handleValidationErrors,
  async (req, res, next) => {
    await login(req, res);
    try {
      await prisma.auditLog.create({
        data: {
          userId: res.locals?.userId || null,
          action: "AUTH_LOGIN",
          metadata: { email: req.body.email },
        },
      });
    } catch (e) {
      console.warn("Audit log login failed:", e);
    }
    next;
  }
);

/**
 * POST /api/auth/refresh
 * Rafraîchir le token d’accès
 * Utilise le cookie httpOnly "uinova_rt"
 * Response: { accessToken, user }
 */
router.post("/refresh", authLimiter, refresh);

/**
 * POST /api/auth/logout
 * Révoquer le refresh token courant + clear cookie
 */
router.post("/logout", authenticate, async (req, res) => {
  await logout(req, res);
  try {
    await prisma.auditLog.create({
      data: {
        userId: (req as any)?.user?.id || null,
        action: "AUTH_LOGOUT",
        metadata: { ip: req.ip },
      },
    });
  } catch (e) {
    console.warn("Audit log logout failed:", e);
  }
});

/**
 * GET /api/auth/me
 * Récupérer le profil utilisateur courant (JWT access requis)
 */
router.get("/me", authenticate, me);

/**
 * GET /api/auth/health
 * Vérifie que le service d’auth fonctionne
 */
router.get("/health", (_req, res) =>
  res.json({
    ok: true,
    service: "auth",
    version: process.env.AUTH_VERSION || "1.0.0",
    timestamp: Date.now(),
  })
);

export default router;
