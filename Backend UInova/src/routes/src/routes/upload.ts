// src/routes/upload.ts
import { Router } from "express";
import { upload } from "../middlewares/upload";
import { uploadSingle, uploadMultiple } from "../controllers/uploadController";
import { authenticate } from "../middlewares/security";

const router = Router();

/* ============================================================================
 *  UPLOAD ROUTES – nécessite authentification
 * ========================================================================== */
router.use(authenticate);

// Middleware Multer configuré (via middlewares/upload.ts)
const handleSingle = upload.single("file");
const handleMultiple = upload.array("files", 10);

/**
 * Gestion d’erreurs Multer centralisée
 * - Gère les erreurs de taille, type, nombre de fichiers, etc.
 * - Renvoie un JSON propre et cohérent
 */
function handleMulterError(middleware: any) {
  return (req: any, res: any, next: any) => {
    middleware(req, res, (err: any) => {
      if (err) {
        console.error("❌ Upload error:", err);

        // Taille max atteinte
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({
            success: false,
            code: "FILE_TOO_LARGE",
            message: "Fichier trop volumineux (max 5 Mo)",
          });
        }

        // Trop de fichiers
        if (err.code === "LIMIT_FILE_COUNT") {
          return res.status(413).json({
            success: false,
            code: "TOO_MANY_FILES",
            message: "Trop de fichiers envoyés (max 10)",
          });
        }

        // Type non supporté
        if (err.code === "LIMIT_UNEXPECTED_FILE") {
          return res.status(415).json({
            success: false,
            code: "INVALID_FIELD",
            message: "Champ ou type de fichier non pris en charge",
          });
        }

        // Erreur générique Multer
        return res.status(400).json({
          success: false,
          code: "UPLOAD_ERROR",
          message: err.message || "Erreur lors du téléversement",
        });
      }
      next();
    });
  };
}

/* ============================================================================
 *  ROUTES
 * ========================================================================== */

/**
 * POST /api/upload
 * → Upload d’un fichier unique
 * Champ: "file"
 */
router.post("/", handleMulterError(handleSingle), uploadSingle);

/**
 * POST /api/upload/multiple
 * → Upload de plusieurs fichiers
 * Champ: "files[]" (max 10 fichiers)
 */
router.post("/multiple", handleMulterError(handleMultiple), uploadMultiple);

export default router;
