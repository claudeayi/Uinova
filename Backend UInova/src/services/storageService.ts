// src/services/storageService.ts
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { logger } from "../utils/logger";
import { emitEvent } from "./eventBus";

// 🔹 Backends cloud (si besoin)
import AWS from "aws-sdk";
// import { Storage } from "@google-cloud/storage";

const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
const STORAGE_BACKEND = process.env.STORAGE_BACKEND || "local"; // "local" | "s3" | "gcp"

/* ============================================================================
 * Helpers
 * ========================================================================== */
function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-z0-9._-]/gi, "_");
}

function checksum(buffer: Buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/* ============================================================================
 * LOCAL STORAGE
 * ========================================================================== */
async function saveLocalFile(filename: string, buffer: Buffer) {
  ensureDir(uploadDir);
  const safeName = sanitizeFilename(filename);
  const filePath = path.join(uploadDir, safeName);

  await fs.promises.writeFile(filePath, buffer);

  logger.info("💾 File saved locally", { filePath, size: buffer.length });

  return {
    url: `/uploads/${safeName}`,
    path: filePath,
    size: buffer.length,
    checksum: checksum(buffer),
  };
}

async function deleteLocalFile(filename: string) {
  const safeName = sanitizeFilename(filename);
  const filePath = path.join(uploadDir, safeName);

  try {
    await fs.promises.unlink(filePath);
    logger.info("🗑️ File deleted locally", { filePath });
    return true;
  } catch {
    logger.warn("⚠️ File not found (local delete)", { filePath });
    return false;
  }
}

/* ============================================================================
 * AWS S3 STORAGE
 * ========================================================================== */
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});
const S3_BUCKET = process.env.S3_BUCKET || "uinova-bucket";

async function saveS3File(filename: string, buffer: Buffer) {
  const safeName = sanitizeFilename(filename);
  await s3
    .putObject({
      Bucket: S3_BUCKET,
      Key: safeName,
      Body: buffer,
    })
    .promise();

  const url = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${safeName}`;
  logger.info("☁️ File uploaded to S3", { key: safeName, size: buffer.length });

  return {
    url,
    path: safeName,
    size: buffer.length,
    checksum: checksum(buffer),
  };
}

async function deleteS3File(filename: string) {
  const safeName = sanitizeFilename(filename);
  await s3
    .deleteObject({ Bucket: S3_BUCKET, Key: safeName })
    .promise()
    .catch((err) => {
      logger.error("❌ S3 delete error", { error: err.message });
    });

  logger.info("🗑️ File deleted from S3", { key: safeName });
  return true;
}

/* ============================================================================
 * EXPORTED API (Backend Agnostic)
 * ========================================================================== */
export async function saveFile(filename: string, buffer: Buffer) {
  let result;
  switch (STORAGE_BACKEND) {
    case "s3":
      result = await saveS3File(filename, buffer);
      break;
    case "gcp":
      throw new Error("GCP storage not yet implemented");
    default:
      result = await saveLocalFile(filename, buffer);
  }

  emitEvent("file.uploaded", { filename, ...result });
  return result;
}

export async function deleteFile(filename: string) {
  switch (STORAGE_BACKEND) {
    case "s3":
      return await deleteS3File(filename);
    case "gcp":
      throw new Error("GCP storage not yet implemented");
    default:
      return await deleteLocalFile(filename);
  }
}
