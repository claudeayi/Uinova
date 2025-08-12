// src/routes/auth.ts
import { Router } from "express";
import {
  register,
  login,
  refresh,
  logout,
  me,
} from "../controllers/authController";
import { requireAuth } from "../middlewares/auth";
import {
  validateRegister,
  validateLogin,
  handleValidationErrors,
} from "../middlewares/validate";
import { authLimiter } from "../middlewares/security";

const router = Router();

/**
 * Auth endpoints
 * - /register  : crée un compte et émet { accessToken, user } + cookie refresh httpOnly
 * - /login     : émet { accessToken, user } + cookie refresh httpOnly
 * - /refresh   : rotation du refresh token (cookie) → { accessToken, user }
 * - /logout    : révoque le refresh courant + clear cookie
 * - /me        : retourne le profil (JWT d'accès requis)
 */

// Applique un rate-limit plus strict sur les endpoints sensibles
router.use(authLimiter);

// Register & Login
router.post("/register", validateRegister, handleValidationErrors, register);
router.post("/login", validateLogin, handleValidationErrors, login);

// Refresh & Logout (utilisent le cookie httpOnly "uinova_rt")
router.post("/refresh", refresh);
router.post("/logout", logout);

// Profil
router.get("/me", requireAuth, me);

export default router;
