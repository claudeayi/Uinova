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

const router = Router();

// Toutes les routes exports nécessitent l'auth
router.use(requireAuth);

/**
 * Créer un export (direct ou enqueue)
 * - Sans page: POST /api/exports/:projectId
 * - Par page : POST /api/exports/:projectId/:pageId
 * Body: { type, content?, strategy?, meta? }
 */
router.post("/:projectId", validateExportSave, handleValidationErrors, saveExport);
router.post("/:projectId/:pageId", validateExportSave, handleValidationErrors, saveExport);

/**
 * Lister les exports (paginé/filtré)
 * GET /api/exports?projectId=...&pageId=...&type=&status=&page=&pageSize=&sort=
 */
router.get("/", validateExportListQuery, handleValidationErrors, list);

/**
 * Détail d’un export (pour polling)
 * GET /api/exports/:id
 */
router.get("/:id", getOne);

/**
 * Hooks worker (optionnels) pour MAJ de statut
 * POST /api/exports/:id/mark-failed    { error? }
 * POST /api/exports/:id/mark-ready     { bundleUrl, meta? }
 */
router.post("/:id/mark-failed", markFailed);
router.post("/:id/mark-ready", markReady);

export default router;
