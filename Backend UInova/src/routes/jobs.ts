// src/routes/jobs.ts
import { Router } from "express";
import { body } from "express-validator";
import { authenticate } from "../middlewares/security";
import { handleValidationErrors } from "../middlewares/validate";
import { JobService } from "../services/jobService";

const router = Router();
const jobs = new JobService();

/* ============================================================================
 * JOBS ROUTES – nécessite authentification utilisateur
 * ============================================================================
 */
router.use(authenticate);

/**
 * POST /api/jobs/export
 * ▶️ Enqueue un job d’export
 * Body:
 * {
 *   projectId: string,     // ID du projet à exporter
 *   target: "html"|"react"|"flutter"|"pwa", // format d’export
 *   exportId?: string      // ID de l’export si existant
 * }
 */
router.post(
  "/export",
  body("projectId")
    .isString()
    .isLength({ min: 5 })
    .withMessage("projectId invalide"),
  body("target")
    .isIn(["html", "react", "flutter", "pwa"])
    .withMessage("target doit être parmi html, react, flutter ou pwa"),
  body("exportId")
    .optional()
    .isString()
    .isLength({ min: 5 })
    .withMessage("exportId invalide"),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { projectId, target, exportId } = req.body;

      const job = await jobs.enqueueExport({ projectId, target, exportId });

      res.status(201).json({
        success: true,
        message: "✅ Job d’export créé avec succès",
        jobId: job.id,
      });
    } catch (err: any) {
      console.error("❌ Export job error:", err);
      res.status(500).json({
        success: false,
        error: "JOB_CREATION_FAILED",
        message: err.message || "Erreur création job export",
      });
    }
  }
);

/* ============================================================================
 * (Optionnel) Extensions futures
 * ============================================================================
 * - POST /api/jobs/deploy → lancer un déploiement
 * - GET /api/jobs/:id     → consulter statut d’un job
 * - DELETE /api/jobs/:id  → annuler un job en attente
 */

export default router;
