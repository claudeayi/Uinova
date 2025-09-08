// src/routes/ar.ts
import { Router } from "express";
import { getARPreview, generateARPreview } from "../controllers/arController";
import { authenticate } from "../middlewares/security";
import { query, body } from "express-validator";
import { handleValidationErrors } from "../middlewares/validate";
import { upload } from "../middlewares/upload"; // Multer pour upload fichier

const router = Router();

/* ============================================================================
 *  AUGMENTED REALITY ROUTES
 * ========================================================================== */

/**
 * GET /api/ar/preview
 * Génère un aperçu AR (mock ou réel selon service configuré).
 * Query params optionnels :
 *  - format: "glb" | "usdz" (par défaut "glb")
 *  - quality: "low" | "medium" | "high" (par défaut "medium")
 */
router.get(
  "/preview",
  // authenticate, // 🔒 active si tu veux protéger
  query("format")
    .optional()
    .isIn(["glb", "usdz"])
    .withMessage("Format invalide (glb | usdz)"),
  query("quality")
    .optional()
    .isIn(["low", "medium", "high"])
    .withMessage("Qualité invalide (low | medium | high)"),
  handleValidationErrors,
  getARPreview
);

/**
 * POST /api/ar/generate
 * Upload d’un modèle 3D et génération d’un aperçu AR personnalisé.
 * Body:
 *   - name: string (nom du modèle)
 *   - format: glb | obj | usdz
 *   - file: champ multipart (modèle 3D)
 *
 * Exemple: POST form-data { name="maMaison", format="glb", file=@modele.glb }
 */
router.post(
  "/generate",
  // authenticate, // 🔒 active si tu veux restreindre
  upload.single("file"), // Multer: champ "file"
  body("name").isString().isLength({ min: 2, max: 100 }).withMessage("Nom invalide"),
  body("format")
    .isIn(["glb", "obj", "usdz"])
    .withMessage("Format invalide (glb | obj | usdz)"),
  handleValidationErrors,
  generateARPreview
);

export default router;
