// src/routes/ar.ts
import { Router } from "express";
import { getARPreview, generateARPreview } from "../controllers/arController";
import { authenticate } from "../middlewares/security";
import { query, body } from "express-validator";
import { handleValidationErrors } from "../middlewares/validate";
import { upload } from "../middlewares/upload"; // Multer pour upload fichier
import { auditLog } from "../services/auditLogService";
import { emitEvent } from "../services/eventBus";
import client from "prom-client";

const router = Router();

/* ============================================================================
 * 📊 Metrics Prometheus
 * ============================================================================
 */
const counterAR = new client.Counter({
  name: "uinova_ar_requests_total",
  help: "Compteur des requêtes AR",
  labelNames: ["route", "method"],
});

const histogramLatency = new client.Histogram({
  name: "uinova_ar_latency_ms",
  help: "Latence des opérations AR",
  labelNames: ["route"],
  buckets: [50, 100, 200, 500, 1000, 5000, 10000],
});

/* ============================================================================
 *  AUGMENTED REALITY ROUTES
 * ============================================================================
 */

/**
 * GET /api/ar/preview
 * Génère un aperçu AR (mock ou réel selon service configuré).
 * Query params optionnels :
 *  - format: "glb" | "usdz" (par défaut "glb")
 *  - quality: "low" | "medium" | "high" (par défaut "medium")
 */
router.get(
  "/preview",
  // authenticate, // 🔒 activer si besoin
  query("format")
    .optional()
    .isIn(["glb", "usdz"])
    .withMessage("Format invalide (glb | usdz)"),
  query("quality")
    .optional()
    .isIn(["low", "medium", "high"])
    .withMessage("Qualité invalide (low | medium | high)"),
  handleValidationErrors,
  async (req, res, next) => {
    const start = Date.now();
    try {
      counterAR.inc({ route: "preview", method: "GET" });
      await auditLog.log(req.user?.id || "guest", "AR_PREVIEW_REQUESTED", req.query);
      emitEvent("ar.preview.requested", { userId: req.user?.id || "guest", ...req.query });

      const result = await getARPreview(req, res, next);

      histogramLatency.labels("preview").observe(Date.now() - start);
      return result;
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * POST /api/ar/generate
 * Upload d’un modèle 3D et génération d’un aperçu AR personnalisé.
 * Body:
 *   - name: string (nom du modèle)
 *   - format: glb | obj | usdz
 *   - file: champ multipart (modèle 3D)
 */
router.post(
  "/generate",
  // authenticate, // 🔒 activer si besoin
  upload.single("file"), // Multer: champ "file"
  body("name").isString().isLength({ min: 2, max: 100 }).withMessage("Nom invalide"),
  body("format").isIn(["glb", "obj", "usdz"]).withMessage("Format invalide (glb | obj | usdz)"),
  handleValidationErrors,
  async (req, res, next) => {
    const start = Date.now();
    try {
      counterAR.inc({ route: "generate", method: "POST" });
      await auditLog.log(req.user?.id || "guest", "AR_GENERATE_REQUESTED", {
        name: req.body.name,
        format: req.body.format,
      });
      emitEvent("ar.generate.requested", {
        userId: req.user?.id || "guest",
        name: req.body.name,
        format: req.body.format,
      });

      const result = await generateARPreview(req, res, next);

      histogramLatency.labels("generate").observe(Date.now() - start);
      return result;
    } catch (err) {
      return next(err);
    }
  }
);

export default router;
