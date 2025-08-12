// src/controllers/uploadController.ts
import { Request, Response } from "express";

const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "application/pdf",
  "text/plain",
  "application/zip",
  "application/x-zip-compressed",
]);

function publicBase(req: Request) {
  // Priorité au CDN si défini, sinon host courant
  const cdn = process.env.CDN_BASE_URL?.replace(/\/+$/, "");
  if (cdn) return cdn;
  const host = req.get("host");
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "http";
  return `${proto}://${host}`;
}

function fileToDTO(req: Request, f: Express.Multer.File) {
  const base = publicBase(req);
  const url = `${base}/uploads/${encodeURIComponent(f.filename)}`;
  return {
    url,
    name: f.originalname,
    filename: f.filename,
    size: f.size,
    mime: f.mimetype,
  };
}

/**
 * POST /api/upload
 * Middleware: upload.single("file")
 * Response: { ok, file: { url, name, filename, size, mime } }
 */
export const uploadSingle = (req: Request, res: Response) => {
  const file = req.file as Express.Multer.File | undefined;
  if (!file) return res.status(400).json({ error: "Aucun fichier reçu (utilise le champ 'file')." });

  if (ALLOWED_MIME.size && !ALLOWED_MIME.has(file.mimetype)) {
    return res.status(415).json({ error: "Type de fichier non autorisé.", mime: file.mimetype });
  }

  return res.status(201).json({ ok: true, file: fileToDTO(req, file) });
};

/**
 * POST /api/uploads
 * Middleware: upload.array("files", 10)
 * Response: { ok, files: Array<{ url, name, filename, size, mime }> }
 */
export const uploadMultiple = (req: Request, res: Response) => {
  const files = (req.files as Express.Multer.File[]) || [];
  if (!files.length) return res.status(400).json({ error: "Aucun fichier reçu (utilise le champ 'files')." });

  const bad = files.find((f) => ALLOWED_MIME.size && !ALLOWED_MIME.has(f.mimetype));
  if (bad) {
    return res.status(415).json({ error: "Type de fichier non autorisé.", mime: bad.mimetype, filename: bad.originalname });
  }

  const items = files.map((f) => fileToDTO(req, f));
  return res.status(201).json({ ok: true, files: items });
};
