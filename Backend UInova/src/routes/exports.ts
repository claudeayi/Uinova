// src/routes/exports.ts
import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import {
  validateExportSave,
  validateExportListQuery,
  handleValidationErrors,
} from "../middlewares/validate";
import {
  saveExport,
  list,
  getOne,
  markFailed,
  markReady,
} from "../controllers/exportController";
import { param, body } from "express-validator";

const router = Router();

/* ============================================================================
 * EXPORTS ROUTES – nécessite authentification
 * ============================================================================
 */
router.use(requireAuth);

/**
 * POST /api/exports/:projectId
 * POST /api/exports/:projectId/:pageId
 * 🆕 Créer un export (direct ou en file d’attente)
 * Body: { type: "react"|"html"|"flutter"|"pwa", content?, strategy?, meta? }
 */
router.post(
  "/:projectId",
  param("projectId").isString().isLength({ min: 8 }).withMessage("projectId invalide"),
  validateExportSave,
  handleValidationErrors,
  saveExport
);

router.post(
  "/:projectId/:pageId",
  param("projectId").isString().isLength({ min: 8 }).withMessage("projectId invalide"),
  param("pageId").isString().isLength({ min: 8 }).withMessage("pageId invalide"),
  validateExportSave,
  handleValidationErrors,
  saveExport
);

/**
 * GET /api/exports
 * 📋 Lister les exports (paginé/filtré)
 * Query: projectId, pageId, type, status, page, pageSize, sort
 */
router.get(
  "/",
  validateExportListQuery,
  handleValidationErrors,
  list
);

/**
 * GET /api/exports/:id
 * 🔎 Détail d’un export (polling frontend)
 */
router.get(
  "/:id",
  param("id").isString().isLength({ min: 10 }).withMessage("ID export invalide"),
  handleValidationErrors,
  getOne
);

/**
 * POST /api/exports/:id/mark-failed
 * ❌ Marquer un export comme échoué
 * Body: { error?: string }
 */
router.post(
  "/:id/mark-failed",
  param("id").isString().isLength({ min: 10 }).withMessage("ID export invalide"),
  body("error").optional().isString().isLength({ max: 500 }),
  handleValidationErrors,
  markFailed
);

/**
 * POST /api/exports/:id/mark-ready
 * ✅ Marquer un export comme prêt
 * Body: { bundleUrl: string, meta?: object }
 */
router.post(
  "/:id/mark-ready",
  param("id").isString().isLength({ min: 10 }).withMessage("ID export invalide"),
  body("bundleUrl").isURL().withMessage("bundleUrl doit être une URL valide"),
  body("meta").optional().isObject(),
  handleValidationErrors,
  markReady
);

export default router;
