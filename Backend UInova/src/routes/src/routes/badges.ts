// src/routes/badges.ts
import { Router } from "express";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { give, list, revoke } from "../controllers/badgeController";
import { validateBadgeGive, handleValidationErrors } from "../middlewares/validate";

const router = Router();

// Toutes les routes badges nécessitent l'authentification
router.use(requireAuth);

/**
 * Créer/attribuer un badge
 * POST /api/badges/give
 * Body: { type: "EARLY_ADOPTER"|..., userId?, meta? }
 * - USER : se l’attribue à lui-même
 * - ADMIN : peut cibler un autre user via userId
 */
router.post("/give", validateBadgeGive, handleValidationErrors, give);

/**
 * Lister les badges
 * GET /api/badges
 * Query: ?userId=&type=&page=&pageSize=&sort=
 * - USER : liste ses badges
 * - ADMIN : peut lister pour un autre user via ?userId=
 */
router.get("/", list);

/**
 * (Optionnel) Révoquer un badge
 * DELETE /api/badges/:id
 * - ADMIN uniquement (ou propriétaire si tu l’as autorisé dans le controller)
 */
router.delete("/:id", requireAdmin, revoke);

export default router;
