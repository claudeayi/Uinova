// src/routes/badges.ts
import { Router } from "express";
import { give, list, revoke } from "../controllers/badgeController";
import { authenticate, authorize } from "../middlewares/security";
import {
  validateBadgeGive,
  handleValidationErrors,
} from "../middlewares/validate";
import { checkSchema } from "express-validator";

const router = Router();

/* ============================================================================
 *  BADGE ROUTES – nécessite authentification
 * ========================================================================== */
router.use(authenticate);

/**
 * POST /api/badges/give
 * Attribuer un badge
 * Body: { type, userId?, meta? }
 *
 * - USER : ne peut que s’attribuer un badge (logique gérée dans le controller)
 * - ADMIN : peut attribuer un badge à n’importe quel user
 */
router.post("/give", validateBadgeGive, handleValidationErrors, give);

/**
 * GET /api/badges
 * Lister les badges
 * Query: ?userId=&type=&page=&pageSize=&sort=
 *
 * - USER : ne peut voir que ses propres badges
 * - ADMIN : peut lister les badges d’un autre utilisateur via userId
 */
router.get(
  "/",
  checkSchema(
    {
      userId: {
        in: ["query"],
        optional: true,
        isString: { errorMessage: "userId doit être une chaîne valide" },
      },
      type: {
        in: ["query"],
        optional: true,
        isIn: {
          options: [
            ["EARLY_ADOPTER", "PRO_USER", "COMMUNITY_HELPER", "TOP_CREATOR", "BETA_TESTER"],
          ],
          errorMessage: "Type de badge invalide",
        },
      },
      page: {
        in: ["query"],
        optional: true,
        toInt: true,
        isInt: { options: { min: 1 }, errorMessage: "page doit être ≥ 1" },
        default: 1,
      },
      pageSize: {
        in: ["query"],
        optional: true,
        toInt: true,
        isInt: {
          options: { min: 1, max: 200 },
          errorMessage: "pageSize doit être entre 1 et 200",
        },
        default: 50,
      },
      sort: {
        in: ["query"],
        optional: true,
        isIn: {
          options: [["earnedAt:desc", "earnedAt:asc", "type:asc", "type:desc"]],
        },
        default: "earnedAt:desc",
      },
    },
    ["query"]
  ),
  handleValidationErrors,
  list
);

/**
 * DELETE /api/badges/:id
 * Révoquer un badge
 *
 * - ADMIN uniquement (ou propriétaire si autorisé dans le controller)
 */
router.delete(
  "/:id",
  checkSchema(
    {
      id: {
        in: ["params"],
        isString: { errorMessage: "id invalide" },
        isLength: {
          options: { min: 10 },
          errorMessage: "id invalide (trop court)",
        },
      },
    },
    ["params"]
  ),
  handleValidationErrors,
  authorize(["admin"]),
  revoke
);

export default router;
