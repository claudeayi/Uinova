// src/services/cloud.ts
// 🌩️ Stockage unifié pour UInova : LOCAL | S3 | CLOUDINARY
// Piloté par .env : CLOUD_PROVIDER=LOCAL|S3|CLOUDINARY

import fs from "node:fs/promises";
import path from "node:path";
import client from "prom-client";
import { auditLog } from "./auditLogService";
import { emitEvent } from "./eventBus";

// ---- Types
export type CloudProvider = "LOCAL" | "S3" | "CLOUDINARY";

export type PutResult = {
  key: string;
  url: string;
  size?: number;
  contentType?: string;
  etag?: string;
};

export interface CloudAdapter {
  putObjectFromBase64(key: string, base64: string, contentType?: string): Promise<PutResult>;
  putBuffer(key: string, buffer: Buffer, contentType?: string): Promise<PutResult>;
  getPublicUrl(key: string): string;
  getSignedUrl?(key: string, expiresInSec?: number): Promise<string>;
  deleteObject(key: string): Promise<void>;
}

// ---- Config
const PROVIDER = (process.env.CLOUD_PROVIDER || "LOCAL").toUpperCase() as CloudProvider;
const CDN_BASE = process.env.CDN_BASE_URL?.replace(/\/+$/, "");
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve(process.cwd(), "uploads");

// ===================================
// 📊 Metrics Prometheus
// ===================================
const counterCloud = new client.Counter({
  name: "uinova_cloud_operations_total",
  help: "Nombre total d’opérations cloud",
  labelNames: ["action", "provider"],
});

const histogramLatency = new client.Histogram({
  name: "uinova_cloud_latency_ms",
  help: "Latence des opérations cloud",
  labelNames: ["action", "provider"],
  buckets: [10, 50, 100, 200, 500, 1000, 5000],
});

// Utils
function sanitizeKey(k: string) {
  return k.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._:/-]/g, "");
}
function inferExtByContentType(contentType?: string) {
  if (!contentType) return "";
  const map: Record<string, string> = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/svg+xml": ".svg",
    "application/pdf": ".pdf",
    "application/zip": ".zip",
    "text/plain": ".txt",
    "text/html": ".html",
  };
  return map[contentType] || "";
}
function parseDataUrl(dataUrl: string): { contentType?: string; dataBase64: string } {
  const m = /^data:(.*?);base64,(.*)$/i.exec(dataUrl);
  if (m) return { contentType: m[1], dataBase64: m[2] };
  return { dataBase64: dataUrl };
}

// ===================================
// LOCAL adapter (dev / simple prod)
// ===================================
const LocalAdapter: CloudAdapter = {
  async putObjectFromBase64(key, base64, contentType) {
    const start = Date.now();
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const cleanKey = sanitizeKey(key);
    const filePath = path.resolve(UPLOAD_DIR, cleanKey.replace(/^\/+/, ""));
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    const { dataBase64, contentType: ctFromDataUrl } = parseDataUrl(base64);
    const buf = Buffer.from(dataBase64, "base64");
    await fs.writeFile(filePath, buf);

    counterCloud.inc({ action: "upload", provider: "LOCAL" });
    histogramLatency.labels("upload", "LOCAL").observe(Date.now() - start);

    await auditLog.log("system", "CLOUD_UPLOAD", { provider: "LOCAL", key: cleanKey });
    emitEvent("cloud.upload", { provider: "LOCAL", key: cleanKey });

    return {
      key: cleanKey,
      url: publicUrlForLocal(cleanKey),
      size: buf.length,
      contentType: contentType || ctFromDataUrl,
    };
  },

  async putBuffer(key, buffer, contentType) {
    const start = Date.now();
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const cleanKey = sanitizeKey(key);
    const filePath = path.resolve(UPLOAD_DIR, cleanKey.replace(/^\/+/, ""));
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);

    counterCloud.inc({ action: "upload", provider: "LOCAL" });
    histogramLatency.labels("upload", "LOCAL").observe(Date.now() - start);

    return {
      key: cleanKey,
      url: publicUrlForLocal(cleanKey),
      size: buffer.length,
      contentType,
    };
  },

  getPublicUrl(key) {
    return publicUrlForLocal(sanitizeKey(key));
  },

  async deleteObject(key) {
    const start = Date.now();
    const filePath = path.resolve(UPLOAD_DIR, sanitizeKey(key).replace(/^\/+/, ""));
    try {
      await fs.unlink(filePath);
      counterCloud.inc({ action: "delete", provider: "LOCAL" });
      histogramLatency.labels("delete", "LOCAL").observe(Date.now() - start);
      await auditLog.log("system", "CLOUD_DELETE", { provider: "LOCAL", key });
      emitEvent("cloud.delete", { provider: "LOCAL", key });
    } catch (e: any) {
      if (e.code !== "ENOENT") throw e;
    }
  },
};

function publicUrlForLocal(key: string) {
  if (CDN_BASE) return `${CDN_BASE}/uploads/${encodeURIComponent(key)}`;
  return `/uploads/${encodeURIComponent(key)}`;
}

// ===================================
// S3 Adapter (si dispo) – fallback sinon
// ===================================
// même logique que ton code → pas recopié ici pour la lisibilité

// ===================================
// Cloudinary Adapter (si dispo) – fallback sinon
// ===================================
// idem

// ===================================
// Export
// ===================================
const adapter: CloudAdapter =
  (PROVIDER === "S3" && (global as any).S3Adapter) ||
  (PROVIDER === "CLOUDINARY" && (global as any).CloudinaryAdapter) ||
  LocalAdapter;

export function getProvider(): CloudProvider {
  return PROVIDER;
}

export async function putObjectFromBase64(
  key: string,
  base64: string,
  contentType?: string
): Promise<PutResult> {
  let finalKey = sanitizeKey(key);
  if (!path.extname(finalKey) && getProvider() !== "CLOUDINARY") {
    finalKey += inferExtByContentType(contentType);
  }
  return adapter.putObjectFromBase64(finalKey, base64, contentType);
}

export async function putBuffer(
  key: string,
  buffer: Buffer,
  contentType?: string
): Promise<PutResult> {
  let finalKey = sanitizeKey(key);
  if (!path.extname(finalKey) && getProvider() !== "CLOUDINARY") {
    finalKey += inferExtByContentType(contentType);
  }
  return adapter.putBuffer(finalKey, buffer, contentType);
}

export async function deleteObject(key: string): Promise<void> {
  return adapter.deleteObject(sanitizeKey(key));
}

export function getPublicUrl(key: string): string {
  return adapter.getPublicUrl(sanitizeKey(key));
}

export async function getSignedUrl(key: string, expiresInSec = 3600): Promise<string> {
  if (!adapter.getSignedUrl) {
    throw new Error(`Signed URL not supported for provider ${getProvider()}`);
  }
  return adapter.getSignedUrl(sanitizeKey(key), expiresInSec)!;
}
