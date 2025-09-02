// src/services/storageService.ts
import fs from "fs";
import path from "path";

const uploadDir = process.env.UPLOAD_DIR || "uploads";

/**
 * Sauvegarde un fichier localement (fallback si pas de cloud).
 */
export async function saveLocalFile(filename: string, buffer: Buffer) {
  const filePath = path.join(uploadDir, filename);
  await fs.promises.writeFile(filePath, buffer);
  return `/uploads/${filename}`;
}

/**
 * Supprime un fichier local.
 */
export async function deleteLocalFile(filename: string) {
  const filePath = path.join(uploadDir, filename);
  await fs.promises.unlink(filePath).catch(() => null);
}
