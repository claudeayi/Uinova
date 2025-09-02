import { Router } from "express";
import { body, param } from "express-validator";
import {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  previewTemplate,
} from "../controllers/emailTemplateController";
import { authenticate, authorize } from "../middlewares/security";
import { handleValidationErrors } from "../middlewares/validate";

const router = Router();

/* ============================================================================
 * EMAIL TEMPLATE ROUTES – ADMIN ONLY
 * ========================================================================== */
router.use(authenticate, authorize(["ADMIN"]));

/**
 * GET /api/admin/email-templates
 * Liste tous les templates
 */
router.get("/", listTemplates);

/**
 * GET /api/admin/email-templates/:id
 * Détail d’un template
 */
router.get("/:id", param("id").isString(), handleValidationErrors, getTemplate);

/**
 * POST /api/admin/email-templates
 * Créer un template
 */
router.post(
  "/",
  body("code").isString().isLength({ min: 3, max: 50 }),
  body("name").isString().isLength({ min: 3, max: 100 }),
  body("subject").isString().isLength({ min: 3, max: 200 }),
  body("bodyHtml").isString().isLength({ min: 3 }),
  handleValidationErrors,
  createTemplate
);

/**
 * PUT /api/admin/email-templates/:id
 * Mettre à jour un template
 */
router.put(
  "/:id",
  param("id").isString(),
  body("name").optional().isString(),
  body("subject").optional().isString(),
  body("bodyHtml").optional().isString(),
  body("bodyText").optional().isString(),
  handleValidationErrors,
  updateTemplate
);

/**
 * DELETE /api/admin/email-templates/:id
 * Supprimer un template
 */
router.delete("/:id", param("id").isString(), handleValidationErrors, deleteTemplate);

/**
 * POST /api/admin/email-templates/:id/preview
 * Générer un rendu preview du template
 */
router.post(
  "/:id/preview",
  param("id").isString(),
  body("variables").isObject().optional(),
  handleValidationErrors,
  previewTemplate
);

export default router;
