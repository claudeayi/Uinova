// src/routes/badges.ts
import { Router } from "express";
import { give, list, revoke } from "../controllers/badgeController";
import { authenticate, authorize } from "../middlewares/security";
import { validateBadgeGive, handleValidationErrors } from "../middlewares/validate";

const router = Router();

/* ============================================================================
 *  BADGE ROUTES – nécessite authentification
 * ========================================================================== */
router.use(authenticate);

/**
 * POST /api/badges/give
 * Attribuer un badge
 * Body: { type, userId?, meta? }
 * - USER : ne peut que s’attribuer un badge (selon la logique du controller)
 * - ADMIN : peut cibler n’importe quel user avec userId
 */
router.post("/give", validateBadgeGive, handleValidationErrors, give);

/**
 * GET /api/badges
 * Lister les badges
 * Query: ?userId=&type=&page=&pageSize=&sort=
 * - USER : liste ses badges
 * - ADMIN : peut lister les badges d’un autre user via userId
 */
router.get("/", list);

/**
 * DELETE /api/badges/:id
 * Révoquer un badge
 * - ADMIN uniquement (ou propriétaire si autorisé dans le controller)
 */
router.delete("/:id", authorize(["admin"]), revoke);

export default router;
