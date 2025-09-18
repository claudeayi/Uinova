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
import { auditLog } from "../services/auditLogService";
import { emitEvent } from "../services/eventBus";
import client from "prom-client";

const router = Router();

/* ============================================================================
 * 📊 Prometheus Metrics
 * ============================================================================
 */
const counterApiKeys = new client.Counter({
  name: "uinova_api_keys_total",
  help: "Compteur des actions sur les API Keys",
  labelNames: ["action", "scope"],
});

/* ============================================================================
 * 🔐 Auth obligatoire pour toutes les routes
 * ============================================================================
 */
router.use(authenticate);

/* ============================================================================
 *  POST /api/api-keys
 *  Créer une clé API (scope: read/write/admin)
 * ============================================================================
 */
router.post(
  "/",
  body("scope")
    .optional()
    .isIn(["read", "write", "admin"])
    .withMessage("Scope invalide (read, write, admin)"),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const result = await createApiKey(req, res, next);
      counterApiKeys.inc({ action: "created", scope: req.body.scope || "*" });
      await auditLog.log(req.user.id, "APIKEY_CREATED", { scope: req.body.scope || "*" });
      emitEvent("apikey.created", { userId: req.user.id, scope: req.body.scope || "*" });
      return result;
    } catch (err) {
      return next(err);
    }
  }
);

/* ============================================================================
 *  GET /api/api-keys
 *  Lister ses propres clés API (masquées)
 * ============================================================================
 */
router.get("/", async (req, res, next) => {
  try {
    const result = await listApiKeys(req, res, next);
    counterApiKeys.inc({ action: "listed", scope: "self" });
    await auditLog.log(req.user.id, "APIKEY_LISTED", { self: true });
    return result;
  } catch (err) {
    return next(err);
  }
});

/* ============================================================================
 *  DELETE /api/api-keys/:id
 *  Révoquer une clé API
 * ============================================================================
 */
router.delete(
  "/:id",
  param("id").isString().withMessage("ID invalide"),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const result = await revokeApiKey(req, res, next);
      counterApiKeys.inc({ action: "revoked", scope: "self" });
      await auditLog.log(req.user.id, "APIKEY_REVOKED", { keyId: req.params.id });
      emitEvent("apikey.revoked", { userId: req.user.id, keyId: req.params.id });
      return result;
    } catch (err) {
      return next(err);
    }
  }
);

/* ============================================================================
 *  ADMIN ROUTES – nécessite rôle ADMIN
 * ============================================================================
 */

/**
 * GET /api/api-keys/all
 * → Lister toutes les clés API (admin only)
 */
router.get("/all", authorize(["ADMIN"]), async (req, res, next) => {
  try {
    const result = await listAllApiKeys(req, res, next);
    counterApiKeys.inc({ action: "listed", scope: "all" });
    await auditLog.log(req.user.id, "APIKEY_LISTED_ALL", {});
    return result;
  } catch (err) {
    return next(err);
  }
});

export default router;
