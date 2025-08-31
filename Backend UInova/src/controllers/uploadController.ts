// src/controllers/uploadController.ts
import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import fs from "fs";
import path from "path";

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

/* ============================================================================
 *  UPLOAD SINGLE
 *  POST /api/upload
 * ========================================================================== */
export const uploadSingle = async (req: Request, res: Response) => {
  try {
    const caller = (req as any).user || { id: "anonymous" };
    const file = req.file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ success: false, message: "Aucun fichier reçu (champ 'file')." });

    if (ALLOWED_MIME.size && !ALLOWED_MIME.has(file.mimetype)) {
      return res.status(415).json({ success: false, message: "Type de fichier non autorisé.", mime: file.mimetype });
    }

    const dto = fileToDTO(req, file);

    // Audit
    await prisma.auditLog.create({
      data: {
        action: "FILE_UPLOAD",
        userId: caller.id || null,
        details: `Upload single: ${dto.filename} (${dto.mime}, ${dto.size} bytes)`,
      },
    });

    return res.status(201).json({ success: true, data: dto });
  } catch (err: any) {
    console.error("❌ uploadSingle error:", err);
    return res.status(500).json({ success: false, message: "Erreur upload fichier" });
  }
};

/* ============================================================================
 *  UPLOAD MULTIPLE
 *  POST /api/uploads
 * ========================================================================== */
export const uploadMultiple = async (req: Request, res: Response) => {
  try {
    const caller = (req as any).user || { id: "anonymous" };
    const files = (req.files as Express.Multer.File[]) || [];
    if (!files.length) return res.status(400).json({ success: false, message: "Aucun fichier reçu (champ 'files')." });

    const bad = files.find((f) => ALLOWED_MIME.size && !ALLOWED_MIME.has(f.mimetype));
    if (bad) {
      return res.status(415).json({
        success: false,
        message: "Type de fichier non autorisé.",
        mime: bad.mimetype,
        filename: bad.originalname,
      });
    }

    const items = files.map((f) => fileToDTO(req, f));

    // Audit
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
 *  DELETE FILE
 *  DELETE /api/upload/:filename
 * ========================================================================== */
export const deleteFile = async (req: Request, res: Response) => {
  try {
    const caller = (req as any).user || { id: "anonymous" };
    const { filename } = req.params;
    if (!filename) return res.status(400).json({ success: false, message: "Nom du fichier requis" });

    const uploadDir = path.join(process.cwd(), "uploads");
    const filePath = path.join(uploadDir, filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);

      await prisma.auditLog.create({
        data: {
          action: "FILE_DELETED",
          userId: caller.id || null,
          details: `Fichier supprimé: ${filename}`,
        },
      });

      return res.json({ success: true, message: "Fichier supprimé avec succès" });
    } else {
      return res.status(404).json({ success: false, message: "Fichier introuvable" });
    }
  } catch (err: any) {
    console.error("❌ deleteFile error:", err);
    return res.status(500).json({ success: false, message: "Erreur suppression fichier" });
  }
};
