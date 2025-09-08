// src/routes/emailTemplates.ts
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
 * ============================================================================
 */
router.use(authenticate, authorize(["ADMIN"]));

/**
 * GET /api/admin/email-templates
 * 📋 Liste tous les templates disponibles
 */
router.get("/", listTemplates);

/**
 * GET /api/admin/email-templates/:id
 * 🔎 Détail d’un template par ID
 */
router.get(
  "/:id",
  param("id")
    .isString()
    .isLength({ min: 10 })
    .withMessage("ID invalide"),
  handleValidationErrors,
  getTemplate
);

/**
 * POST /api/admin/email-templates
 * 🆕 Créer un nouveau template email
 * Body: { code, name, subject, bodyHtml, bodyText?, lang? }
 */
router.post(
  "/",
  body("code")
    .isString()
    .isLength({ min: 3, max: 50 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage("Code invalide (caractères autorisés: lettres, chiffres, _ et -)")
    .trim(),
  body("name")
    .isString()
    .isLength({ min: 3, max: 100 })
    .withMessage("Nom invalide (3–100 caractères)")
    .trim(),
  body("subject")
    .isString()
    .isLength({ min: 3, max: 200 })
    .withMessage("Sujet invalide (3–200 caractères)")
    .trim(),
  body("bodyHtml")
    .isString()
    .isLength({ min: 3 })
    .withMessage("Le corps HTML est obligatoire"),
  body("bodyText").optional().isString(),
  body("lang")
    .optional()
    .isString()
    .isLength({ min: 2, max: 5 })
    .withMessage("Lang invalide (ex: fr, en, es)")
    .trim(),
  handleValidationErrors,
  createTemplate
);

/**
 * PUT /api/admin/email-templates/:id
 * ✏️ Mettre à jour un template existant
 */
router.put(
  "/:id",
  param("id")
    .isString()
    .isLength({ min: 10 })
    .withMessage("ID invalide"),
  body("name")
    .optional()
    .isString()
    .isLength({ min: 3, max: 100 })
    .withMessage("Nom invalide (3–100 caractères)")
    .trim(),
  body("subject")
    .optional()
    .isString()
    .isLength({ min: 3, max: 200 })
    .withMessage("Sujet invalide (3–200 caractères)")
    .trim(),
  body("bodyHtml")
    .optional()
    .isString()
    .isLength({ min: 3 })
    .withMessage("Le corps HTML doit avoir au moins 3 caractères"),
  body("bodyText").optional().isString(),
  body("lang")
    .optional()
    .isString()
    .isLength({ min: 2, max: 5 })
    .withMessage("Lang invalide (ex: fr, en, es)")
    .trim(),
  handleValidationErrors,
  updateTemplate
);

/**
 * DELETE /api/admin/email-templates/:id
 * 🗑️ Supprimer un template
 */
router.delete(
  "/:id",
  param("id")
    .isString()
    .isLength({ min: 10 })
    .withMessage("ID invalide"),
  handleValidationErrors,
  deleteTemplate
);

/**
 * POST /api/admin/email-templates/:id/preview
 * 👀 Générer un rendu preview d’un template avec variables dynamiques
 * Body: { variables?: Record<string, any> }
 */
router.post(
  "/:id/preview",
  param("id")
    .isString()
    .isLength({ min: 10 })
    .withMessage("ID invalide"),
  body("variables")
    .optional()
    .isObject()
    .withMessage("Variables doit être un objet valide")
    .default({}),
  handleValidationErrors,
  previewTemplate
);

export default router;
