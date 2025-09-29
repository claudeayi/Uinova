// src/services/cloud.ts
// Stockage unifié pour UInova : LOCAL | S3 | CLOUDINARY
// Piloté par .env : CLOUD_PROVIDER=LOCAL|S3|CLOUDINARY

import fs from "node:fs/promises";
import path from "node:path";

// ---- Types
export type CloudProvider = "LOCAL" | "S3" | "CLOUDINARY";

export type PutResult = {
  key: string;        // identifiant interne (chemin / key S3 / public_id Cloudinary)
  url: string;        // URL publique (ou relative pour LOCAL si pas de CDN_BASE_URL)
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
const CDN_BASE = process.env.CDN_BASE_URL?.replace(/\/+$/, ""); // optionnel
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve(process.cwd(), "uploads");

// Utils
function sanitizeKey(k: string) {
  // évite caractères dangereux dans les clés / chemins
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
  // data:<mime>;base64,<payload>
  const m = /^data:(.*?);base64,(.*)$/i.exec(dataUrl);
  if (m) return { contentType: m[1], dataBase64: m[2] };
  return { dataBase64: dataUrl };
}

// ===================================
// LOCAL adapter (dev / simple prod)
// ===================================
const LocalAdapter: CloudAdapter = {
  async putObjectFromBase64(key, base64, contentType) {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const cleanKey = sanitizeKey(key);
    const filePath = path.resolve(UPLOAD_DIR, cleanKey.replace(/^\/+/, ""));
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    // si dataURL → strip header
    const { dataBase64, contentType: ctFromDataUrl } = parseDataUrl(base64);
    const buf = Buffer.from(dataBase64, "base64");
    await fs.writeFile(filePath, buf);

    return {
      key: cleanKey,
      url: publicUrlForLocal(cleanKey),
      size: buf.length,
      contentType: contentType || ctFromDataUrl,
    };
  },

  async putBuffer(key, buffer, contentType) {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const cleanKey = sanitizeKey(key);
    const filePath = path.resolve(UPLOAD_DIR, cleanKey.replace(/^\/+/, ""));
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, buffer);

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
    const filePath = path.resolve(UPLOAD_DIR, sanitizeKey(key).replace(/^\/+/, ""));
    try {
      await fs.unlink(filePath);
    } catch (e: any) {
      if (e.code !== "ENOENT") throw e;
    }
  },
};

function publicUrlForLocal(key: string) {
  if (CDN_BASE) return `${CDN_BASE}/uploads/${encodeURIComponent(key)}`;
  // URL relative (ton app.ts doit servir /uploads en statique)
  return `/uploads/${encodeURIComponent(key)}`;
}

// ===================================
// S3 / MinIO adapter
// ===================================
let S3Adapter: CloudAdapter | null = null;
if (PROVIDER === "S3") {
  try {
    // Lazy import pour ne pas imposer la dépendance si non utilisée
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

    const S3_BUCKET = process.env.S3_BUCKET!;
    const S3_REGION = process.env.S3_REGION || "us-east-1";
    const S3_ENDPOINT = process.env.S3_ENDPOINT; // pour MinIO/compat
    const S3_FORCE_PATH_STYLE = process.env.S3_FORCE_PATH_STYLE === "1";

    if (!S3_BUCKET) throw new Error("S3_BUCKET is required for CLOUD_PROVIDER=S3");

    const s3 = new S3Client({
      region: S3_REGION,
      endpoint: S3_ENDPOINT || undefined,
      forcePathStyle: S3_FORCE_PATH_STYLE || !!S3_ENDPOINT,
      credentials: process.env.S3_ACCESS_KEY_ID
        ? {
            accessKeyId: process.env.S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
          }
        : undefined,
    });

    S3Adapter = {
      async putObjectFromBase64(key, base64, contentType) {
        const cleanKey = sanitizeKey(key);
        const { dataBase64, contentType: ctFromDataUrl } = parseDataUrl(base64);
        const Body = Buffer.from(dataBase64, "base64");
        const ContentType = contentType || ctFromDataUrl;

        await s3.send(new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: cleanKey,
          Body,
          ContentType,
          ACL: "public-read", // si ton bucket est public ; sinon supprime et utilise getSignedUrl
        }));

        return {
          key: cleanKey,
          url: publicUrlForS3(S3_BUCKET, cleanKey),
          size: Body.length,
          contentType: ContentType,
        };
      },

      async putBuffer(key, buffer, contentType) {
        const cleanKey = sanitizeKey(key);
        await s3.send(new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: cleanKey,
          Body: buffer,
          ContentType: contentType,
          ACL: "public-read",
        }));
        return {
          key: cleanKey,
          url: publicUrlForS3(S3_BUCKET, cleanKey),
          size: buffer.length,
          contentType,
        };
      },

      getPublicUrl(key) {
        return publicUrlForS3(S3_BUCKET, sanitizeKey(key));
      },

      async getSignedUrl(key, expiresInSec = 3600) {
        const cleanKey = sanitizeKey(key);
        const cmd = new PutObjectCommand({ Bucket: S3_BUCKET, Key: cleanKey });
        // NB: ici presign PUT; adaptez pour GET si nécessaire
        return getSignedUrl(s3, cmd, { expiresIn: expiresInSec });
      },

      async deleteObject(key) {
        await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: sanitizeKey(key) }));
      },
    };

    function publicUrlForS3(bucket: string, key: string) {
      if (CDN_BASE) return `${CDN_BASE}/${encodeURIComponent(key)}`;
      if (S3_ENDPOINT) {
        // MinIO/endpoint custom
        const base = S3_FORCE_PATH_STYLE ? `${S3_ENDPOINT}/${bucket}` : `${S3_ENDPOINT}/${bucket}`;
        return `${base}/${encodeURIComponent(key)}`;
      }
      return `https://${bucket}.s3.${S3_REGION}.amazonaws.com/${encodeURIComponent(key)}`;
    }
  } catch (e) {
    // si dépendances S3 non installées, on retombe sur LOCAL
    console.warn("[cloud] S3 adapter not available, falling back to LOCAL:", e?.message || e);
  }
}

// ===================================
// Cloudinary adapter
// ===================================
let CloudinaryAdapter: CloudAdapter | null = null;
if (PROVIDER === "CLOUDINARY") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cloudinary = require("cloudinary").v2;
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });

    CloudinaryAdapter = {
      async putObjectFromBase64(key, base64, contentType) {
        // Cloudinary gère les dataURL directement
        const cleanKey = sanitizeKey(key).replace(/\.[a-z0-9]+$/i, ""); // public_id sans extension
        const { dataBase64 } = parseDataUrl(base64);
        const dataUrl = `data:${contentType || "application/octet-stream"};base64,${dataBase64}`;

        const res = await cloudinary.uploader.upload(dataUrl, {
          public_id: cleanKey,
          resource_type: "auto",
          overwrite: true,
        });

        return {
          key: res.public_id,
          url: res.secure_url,
          size: res.bytes,
          contentType: res.resource_type,
          etag: res.etag,
        };
      },

      async putBuffer(key, buffer, contentType) {
        const cleanKey = sanitizeKey(key).replace(/\.[a-z0-9]+$/i, "");
        const streamUpload = () =>
          new Promise<any>((resolve, reject) => {
            const cldStream = cloudinary.uploader.upload_stream(
              { public_id: cleanKey, resource_type: "auto", overwrite: true },
              (err: any, result: any) => (err ? reject(err) : resolve(result))
            );
            cldStream.end(buffer);
          });

        const res = await streamUpload();
        return {
          key: res.public_id,
          url: res.secure_url,
          size: res.bytes,
          contentType: contentType || res.resource_type,
          etag: res.etag,
        };
      },

      getPublicUrl(key) {
        // public_id → construire une URL ; simplest: renvoyer secure URL format
        // Cloudinary sait dériver les transformations si besoin côté front
        return CDN_BASE ? `${CDN_BASE}/${encodeURIComponent(key)}` : `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${encodeURIComponent(key)}`;
      },

      async deleteObject(key) {
        // resource_type auto : on tente image/video/raw dans cet ordre
        const publicId = sanitizeKey(key);
        const cloudinary = require("cloudinary").v2;
        const types = ["image", "video", "raw"];
        for (const t of types) {
          const r = await cloudinary.uploader.destroy(publicId, { resource_type: t });
          if (r.result === "ok") return;
        }
      },
    };
  } catch (e) {
    console.warn("[cloud] Cloudinary adapter not available, falling back to LOCAL:", e?.message || e);
  }
}

// ===================================
// Export : adapter sélectionné + helpers
// ===================================
const adapter: CloudAdapter =
  (PROVIDER === "S3" && S3Adapter) ||
  (PROVIDER === "CLOUDINARY" && CloudinaryAdapter) ||
  LocalAdapter;

export function getProvider(): CloudProvider {
  return (PROVIDER === "S3" && S3Adapter && "S3") ||
         (PROVIDER === "CLOUDINARY" && CloudinaryAdapter && "CLOUDINARY") ||
         "LOCAL";
}

/**
 * putObjectFromBase64
 * - Accepte dataURL ou base64 brut.
 * - Ajoute extension si absente en se basant sur contentType.
 */
export async function putObjectFromBase64(key: string, base64: string, contentType?: string): Promise<PutResult> {
  let finalKey = sanitizeKey(key);
  if (!path.extname(finalKey) && getProvider() !== "CLOUDINARY") {
    finalKey += inferExtByContentType(contentType);
  }
  return adapter.putObjectFromBase64(finalKey, base64, contentType);
}

/** putBuffer : upload d'un Buffer binaire */
export async function putBuffer(key: string, buffer: Buffer, contentType?: string): Promise<PutResult> {
  let finalKey = sanitizeKey(key);
  if (!path.extname(finalKey) && getProvider() !== "CLOUDINARY") {
    finalKey += inferExtByContentType(contentType);
  }
  return adapter.putBuffer(finalKey, buffer, contentType);
}

/** deleteObject : supprime l'objet distant */
export async function deleteObject(key: string): Promise<void> {
  return adapter.deleteObject(sanitizeKey(key));
}

/** getPublicUrl : récupère l'URL publique de l'objet */
export function getPublicUrl(key: string): string {
  return adapter.getPublicUrl(sanitizeKey(key));
}

/**
 * (Optionnel) getSignedUrl : presigned URL d'upload (S3 uniquement)
 * - Pour Cloudinary, privilégie les uploads direct front (unsigned) si configuré
 */
export async function getSignedUrl(key: string, expiresInSec = 3600): Promise<string> {
  if (!adapter.getSignedUrl) {
    throw new Error(`Signed URL not supported for provider ${getProvider()}`);
  }
  return adapter.getSignedUrl(sanitizeKey(key), expiresInSec)!;
}