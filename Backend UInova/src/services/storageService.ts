// src/services/storageService.ts
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { logger } from "../utils/logger";
import { emitEvent } from "./eventBus";
import { auditLog } from "./auditLogService";
import client from "prom-client";

// 🔹 Backends cloud
import AWS from "aws-sdk";
// import { Storage } from "@google-cloud/storage";

const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
const STORAGE_BACKEND = process.env.STORAGE_BACKEND || "local"; // "local" | "s3" | "gcp"

/* ============================================================================
 * 📊 Metrics Prometheus
 * ============================================================================
 */
const counterFiles = new client.Counter({
  name: "uinova_storage_files_total",
  help: "Nombre total de fichiers traités",
  labelNames: ["action", "backend"],
});

const histogramSize = new client.Histogram({
  name: "uinova_storage_file_size_bytes",
  help: "Distribution des tailles de fichiers uploadés",
  labelNames: ["backend"],
  buckets: [1024, 10_000, 100_000, 1_000_000, 10_000_000], // 1KB → 10MB
});

/* ============================================================================
 * Helpers
 * ============================================================================
 */
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
 * ============================================================================
 */
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
 * ============================================================================
 */
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
  try {
    await s3.deleteObject({ Bucket: S3_BUCKET, Key: safeName }).promise();
    logger.info("🗑️ File deleted from S3", { key: safeName });
    return true;
  } catch (err: any) {
    logger.error("❌ S3 delete error", { error: err.message });
    return false;
  }
}

/* ============================================================================
 * GCP STORAGE (optionnel)
 * ============================================================================
 */
async function saveGCPFile(_filename: string, _buffer: Buffer) {
  throw new Error("GCP storage not yet implemented");
}
async function deleteGCPFile(_filename: string) {
  throw new Error("GCP storage not yet implemented");
}

/* ============================================================================
 * EXPORTED API (Backend Agnostic)
 * ============================================================================
 */
export async function saveFile(filename: string, buffer: Buffer, userId: string = "system") {
  let result;
  const start = Date.now();

  try {
    switch (STORAGE_BACKEND) {
      case "s3":
        result = await saveS3File(filename, buffer);
        break;
      case "gcp":
        result = await saveGCPFile(filename, buffer);
        break;
      default:
        result = await saveLocalFile(filename, buffer);
    }

    counterFiles.inc({ action: "upload", backend: STORAGE_BACKEND });
    histogramSize.labels(STORAGE_BACKEND).observe(buffer.length);

    await auditLog.log(userId, "FILE_UPLOADED", { filename, backend: STORAGE_BACKEND, ...result });
    emitEvent("file.uploaded", { filename, backend: STORAGE_BACKEND, ...result });

    logger.info(`📦 File uploaded via ${STORAGE_BACKEND}`, { filename, size: buffer.length });
    return result;
  } catch (err: any) {
    logger.error("❌ saveFile error", { error: err.message });
    await auditLog.log(userId, "FILE_UPLOAD_FAILED", { filename, backend: STORAGE_BACKEND, error: err.message });
    emitEvent("file.upload.failed", { filename, backend: STORAGE_BACKEND, error: err.message });
    throw err;
  } finally {
    logger.debug(`⏱️ saveFile latency: ${Date.now() - start}ms`);
  }
}

export async function deleteFile(filename: string, userId: string = "system") {
  try {
    let ok;
    switch (STORAGE_BACKEND) {
      case "s3":
        ok = await deleteS3File(filename);
        break;
      case "gcp":
        ok = await deleteGCPFile(filename);
        break;
      default:
        ok = await deleteLocalFile(filename);
    }

    counterFiles.inc({ action: "delete", backend: STORAGE_BACKEND });

    await auditLog.log(userId, "FILE_DELETED", { filename, backend: STORAGE_BACKEND, ok });
    emitEvent("file.deleted", { filename, backend: STORAGE_BACKEND, ok });

    return ok;
  } catch (err: any) {
    logger.error("❌ deleteFile error", { error: err.message });
    await auditLog.log(userId, "FILE_DELETE_FAILED", { filename, backend: STORAGE_BACKEND, error: err.message });
    emitEvent("file.delete.failed", { filename, backend: STORAGE_BACKEND, error: err.message });
    return false;
  }
}

/* ============================================================================
 * Extra: récupérer metadata (utile pour UI/Admin)
 * ============================================================================
 */
export async function getFileMetadata(filename: string) {
  const safeName = sanitizeFilename(filename);
  const filePath = path.join(uploadDir, safeName);

  try {
    const stat = await fs.promises.stat(filePath);
    return {
      filename: safeName,
      size: stat.size,
      checksum: checksum(await fs.promises.readFile(filePath)),
      modifiedAt: stat.mtime,
    };
  } catch {
    return null;
  }
}
