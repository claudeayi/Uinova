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

const router = Router();

/* ============================================================================
 *  AUTH ROUTES
 *  Flux complet : Register → Login → Refresh → Logout → Me
 * ========================================================================== */

// 🔒 Applique un rate-limit strict sur les endpoints sensibles
router.use(authLimiter);

/**
 * POST /api/auth/register
 * Créer un compte utilisateur
 * Body: { email, password, name? }
 * Response: { accessToken, user } + cookie refresh httpOnly
 */
router.post("/register", validateRegister, handleValidationErrors, register);

/**
 * POST /api/auth/login
 * Authentifier un utilisateur
 * Body: { email, password }
 * Response: { accessToken, user } + cookie refresh httpOnly
 */
router.post("/login", validateLogin, handleValidationErrors, login);

/**
 * POST /api/auth/refresh
 * Rafraîchir le token d’accès
 * Utilise le cookie httpOnly "uinova_rt"
 * Response: { accessToken, user }
 */
router.post("/refresh", refresh);

/**
 * POST /api/auth/logout
 * Révoquer le refresh token courant + clear cookie
 */
router.post("/logout", logout);

/**
 * GET /api/auth/me
 * Récupérer le profil utilisateur courant (JWT access requis)
 */
router.get("/me", authenticate, me);

export default router;
