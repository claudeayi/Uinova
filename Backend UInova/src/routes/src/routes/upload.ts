// src/routes/upload.ts
import { Router } from "express";
import { upload } from "../middlewares/upload";
import { upload as uploadController } from "../controllers/uploadController";
import { requireAuth } from "../middlewares/auth";

// Création du routeur
const router = Router();

// Configuration Multer avec validation de type et limite de taille
const fileUpload = upload.single("file");

/**
 * Upload d'un fichier
 * POST /api/upload
 */
router.post("/", requireAuth, (req, res, next) => {
  fileUpload(req, res, (err: any) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ message: "Fichier trop volumineux (max 5 Mo)" });
      }
      return res.status(400).json({ message: err.message || "Erreur lors du téléversement" });
    }
    next();
  });
}, uploadController);

export default router;
