// src/routes/apiKeys.ts
import { Router } from "express";
import { authenticate, authorize } from "../middlewares/security";
import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
  listAllApiKeys,
} from "../controllers/apiKeyController";
import { body, param } from "express-validator";
import { handleValidationErrors } from "../middlewares/validate";

const router = Router();

/* ============================================================================
 *  API KEY ROUTES – nécessite authentification
 * ========================================================================== */
router.use(authenticate);

/**
 * POST /api/api-keys
 * Créer une clé API (affichée une seule fois)
 * Body: { scope?: string }
 */
router.post(
  "/",
  body("scope")
    .optional()
    .isIn(["read", "write", "admin"])
    .withMessage("Scope invalide (read, write, admin)"),
  handleValidationErrors,
  createApiKey
);

/**
 * GET /api/api-keys
 * Lister ses propres clés API (masquées)
 */
router.get("/", listApiKeys);

/**
 * DELETE /api/api-keys/:id
 * Révoquer une clé API
 */
router.delete(
  "/:id",
  param("id").isString().withMessage("ID invalide"),
  handleValidationErrors,
  revokeApiKey
);

/* ============================================================================
 *  ADMIN ROUTES – nécessite rôle ADMIN
 * ========================================================================== */

/**
 * GET /api/api-keys/all
 * Lister toutes les clés API (admin only)
 */
router.get("/all", authorize(["ADMIN"]), listAllApiKeys);

export default router;
