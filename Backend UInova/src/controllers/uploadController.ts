// src/controllers/uploadController.ts
import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import fs from "fs";
import path from "path";
import crypto from "crypto";

// (optionnel) sharp pour thumbnails
let sharp: any = null;
try {
  sharp = require("sharp");
} catch {
  console.warn("⚠️ sharp non installé, thumbnails désactivés.");
}

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

const MAX_SIZE = 10 * 1024 * 1024; // 10MB max
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const SOFT_DELETE = process.env.UPLOAD_SOFT_DELETE === "true";

/* ============================================================================
 * HELPERS
 * ========================================================================== */
function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function publicBase(req: Request) {
  const cdn = process.env.CDN_BASE_URL?.replace(/\/+$/, "");
  if (cdn) return cdn;
  const host = req.get("host");
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "http";
  return `${proto}://${host}`;
}

function computeHash(buffer: Buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function fileToDTO(req: Request, f: Express.Multer.File, hash?: string, thumb?: string) {
  const base = publicBase(req);
  const url = `${base}/uploads/${encodeURIComponent(f.filename)}`;
  return {
    url,
    name: f.originalname,
    filename: f.filename,
    size: f.size,
    mime: f.mimetype,
    hash,
    thumbnail: thumb || null,
  };
}

/* ============================================================================
 * UPLOAD SINGLE
 * ========================================================================== */
export const uploadSingle = async (req: Request, res: Response) => {
  try {
    const caller = (req as any).user || { id: "anonymous" };
    const file = req.file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ success: false, message: "Aucun fichier reçu (champ 'file')." });

    if (file.size > MAX_SIZE) {
      return res.status(413).json({ success: false, message: "Fichier trop volumineux (10MB max)" });
    }
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return res.status(415).json({ success: false, message: "Type de fichier non autorisé.", mime: file.mimetype });
    }

    file.filename = sanitizeFilename(file.filename);
    const buffer = fs.readFileSync(file.path);
    const hash = computeHash(buffer);

    // Générer thumbnail si image
    let thumb: string | undefined;
    if (sharp && file.mimetype.startsWith("image/")) {
      try {
        const thumbBuf = await sharp(buffer).resize(200).toBuffer();
        thumb = `data:image/png;base64,${thumbBuf.toString("base64")}`;
      } catch {}
    }

    const dto = fileToDTO(req, file, hash, thumb);

    await prisma.auditLog.create({
      data: {
        action: "FILE_UPLOAD",
        userId: caller.id || null,
        details: `Upload single: ${dto.filename}`,
        metadata: { size: dto.size, mime: dto.mime, hash },
      },
    });

    return res.status(201).json({ success: true, data: dto });
  } catch (err: any) {
    console.error("❌ uploadSingle error:", err);
    return res.status(500).json({ success: false, message: "Erreur upload fichier" });
  }
};

/* ============================================================================
 * UPLOAD MULTIPLE
 * ========================================================================== */
export const uploadMultiple = async (req: Request, res: Response) => {
  try {
    const caller = (req as any).user || { id: "anonymous" };
    const files = (req.files as Express.Multer.File[]) || [];
    if (!files.length) return res.status(400).json({ success: false, message: "Aucun fichier reçu (champ 'files')." });

    const items = [];
    for (const f of files) {
      if (f.size > MAX_SIZE) {
        return res.status(413).json({ success: false, message: `Fichier ${f.originalname} trop volumineux (10MB max)` });
      }
      if (!ALLOWED_MIME.has(f.mimetype)) {
        return res.status(415).json({ success: false, message: "Type de fichier non autorisé.", mime: f.mimetype });
      }

      f.filename = sanitizeFilename(f.filename);
      const buffer = fs.readFileSync(f.path);
      const hash = computeHash(buffer);

      let thumb: string | undefined;
      if (sharp && f.mimetype.startsWith("image/")) {
        try {
          const thumbBuf = await sharp(buffer).resize(200).toBuffer();
          thumb = `data:image/png;base64,${thumbBuf.toString("base64")}`;
        } catch {}
      }

      items.push(fileToDTO(req, f, hash, thumb));
    }

    await prisma.auditLog.create({
      data: {
        action: "FILES_UPLOAD",
        userId: caller.id || null,
        details: `Upload multiple: ${items.length} fichiers`,
      },
    });

    return res.status(201).json({ success: true, data: items });
  } catch (err: any) {
    console.error("❌ uploadMultiple error:", err);
    return res.status(500).json({ success: false, message: "Erreur upload fichiers" });
  }
};

/* ============================================================================
 * DOWNLOAD FILE
 * ========================================================================== */
export const downloadFile = async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    if (!filename) return res.status(400).json({ success: false, message: "Nom du fichier requis" });

    const safeName = sanitizeFilename(filename);
    const filePath = path.join(UPLOAD_DIR, safeName);

    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, message: "Fichier introuvable" });

    res.download(filePath, safeName);
  } catch (err: any) {
    console.error("❌ downloadFile error:", err);
    return res.status(500).json({ success: false, message: "Erreur téléchargement fichier" });
  }
};

/* ============================================================================
 * DELETE FILE
 * ========================================================================== */
export const deleteFile = async (req: Request, res: Response) => {
  try {
    const caller = (req as any).user || { id: "anonymous" };
    const { filename } = req.params;
    if (!filename) return res.status(400).json({ success: false, message: "Nom du fichier requis" });

    const safeName = sanitizeFilename(filename);
    const filePath = path.join(UPLOAD_DIR, safeName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: "Fichier introuvable" });
    }

    if (SOFT_DELETE) {
      const trashDir = path.join(UPLOAD_DIR, ".trash");
      fs.mkdirSync(trashDir, { recursive: true });
      fs.renameSync(filePath, path.join(trashDir, safeName));
    } else {
      fs.unlinkSync(filePath);
    }

    await prisma.auditLog.create({
      data: {
        action: "FILE_DELETED",
        userId: caller.id || null,
        details: `Fichier supprimé: ${safeName}`,
      },
    });

    return res.json({ success: true, message: "Fichier supprimé avec succès" });
  } catch (err: any) {
    console.error("❌ deleteFile error:", err);
    return res.status(500).json({ success: false, message: "Erreur suppression fichier" });
  }
};

/* ============================================================================
 * LIST FILES (avec pagination, recherche)
 * ========================================================================== */
export const listFiles = async (req: Request, res: Response) => {
  try {
    if (!fs.existsSync(UPLOAD_DIR)) return res.json({ success: true, data: [] });

    const { search = "", page = "1", limit = "20" } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    let files = fs.readdirSync(UPLOAD_DIR).filter((f) => !f.startsWith("."));
    if (search) {
      files = files.filter((f) => f.toLowerCase().includes(String(search).toLowerCase()));
    }

    const total = files.length;
    const pageFiles = files.slice(skip, skip + Number(limit));

    const items = pageFiles.map((filename) => {
      const stats = fs.statSync(path.join(UPLOAD_DIR, filename));
      return {
        filename,
        size: stats.size,
        uploadedAt: stats.birthtime,
        url: `${publicBase(req)}/uploads/${encodeURIComponent(filename)}`,
      };
    });

    res.json({
      success: true,
      data: items,
      pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch (err: any) {
    console.error("❌ listFiles error:", err);
    return res.status(500).json({ success: false, message: "Erreur récupération fichiers" });
  }
};
