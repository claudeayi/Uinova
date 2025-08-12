// src/middlewares/upload.ts
import multer, { FileFilterCallback } from "multer";
import path from "path";
import { Request } from "express";

// Dossier de destination (uploads local)
const UPLOAD_DIR = process.env.UPLOAD_DIR || "uploads/";

// Limite de taille en octets (ex: 5 Mo par défaut)
const FILE_SIZE_LIMIT = Number(process.env.UPLOAD_MAX_SIZE || 5 * 1024 * 1024);

// Types MIME autorisés
const ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "application/zip",
];

// Génère un nom de fichier unique et sûr
function generateFileName(file: Express.Multer.File) {
  const safeName = file.originalname.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "");
  const timestamp = Date.now();
  return `${timestamp}_${safeName}`;
}

// Filtrage des fichiers (sécurité)
const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (!ALLOWED_MIME.includes(file.mimetype)) {
    return cb(new Error("Type de fichier non autorisé"));
  }
  cb(null, true);
};

// Stockage local
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => cb(null, generateFileName(file)),
});

// Middleware Multer configuré
export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: FILE_SIZE_LIMIT },
});

// Exemple d’usage dans une route
// router.post("/upload", upload.single("file"), (req, res) => {
//   res.json({ url: `/uploads/${req.file.filename}` });
// });
