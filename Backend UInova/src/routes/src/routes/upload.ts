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

// Middleware Multer
const handleSingle = upload.single("file");
const handleMultiple = upload.array("files", 10);

// Gestion d’erreur Multer centralisée
function handleMulterError(middleware: any) {
  return (req: any, res: any, next: any) => {
    middleware(req, res, (err: any) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({
            success: false,
            message: "Fichier trop volumineux (max 5 Mo)",
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message || "Erreur lors du téléversement",
        });
      }
      next();
    });
  };
}

/**
 * POST /api/upload → Upload d’un fichier unique
 * Champ: "file"
 */
router.post("/", handleMulterError(handleSingle), uploadSingle);

/**
 * POST /api/uploads → Upload multiple
 * Champ: "files[]" (max 10)
 */
router.post("/multiple", handleMulterError(handleMultiple), uploadMultiple);

export default router;
