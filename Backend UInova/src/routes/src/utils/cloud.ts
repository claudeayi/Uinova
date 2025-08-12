// src/services/uploadToCloud.ts
import fs from "node:fs/promises";
import path from "node:path";
import mime from "mime";
import { putBuffer, putObjectFromBase64, getProvider } from "./cloud";

/**
 * Upload un fichier local OU une dataURL/base64 vers le provider configuré.
 * @param input - chemin de fichier local (ex: "/tmp/xxx.png") OU dataURL/base64
 * @param opts  - keyPrefix pour organiser (ex: "uploads/avatars"), filename si tu veux forcer un nom
 * @returns { url, key, size, contentType }
 */
export async function uploadToCloud(
  input: string,
  opts: { keyPrefix?: string; filename?: string } = {}
): Promise<{ url: string; key: string; size?: number; contentType?: string }> {
  const keyPrefix = (opts.keyPrefix || "uploads").replace(/^\/+|\/+$/g, "");
  const provider = getProvider();

  // 1) Data URL/base64 ?
  const isDataUrl = /^data:[^;]+;base64,/.test(input);
  const isBase64 = !isDataUrl && /^[A-Za-z0-9+/=\s]+$/.test(input) && input.length > 200 && input.includes("=");

  if (isDataUrl) {
    // data:<mime>;base64,<payload>
    const m = /^data:([^;]+);base64,(.*)$/i.exec(input)!;
    const contentType = m[1];
    const base64 = m[2];

    const finalName = buildFileName(opts.filename, contentType);
    const key = `${keyPrefix}/${finalName}`;
    const r = await putObjectFromBase64(key, `data:${contentType};base64,${base64}`, contentType);
    return { url: r.url, key: r.key, size: r.size, contentType: r.contentType };
  }

  if (isBase64 && !looksLikePath(input)) {
    const contentType = "application/octet-stream";
    const finalName = buildFileName(opts.filename, contentType);
    const key = `${keyPrefix}/${finalName}`;
    const r = await putObjectFromBase64(key, input, contentType);
    return { url: r.url, key: r.key, size: r.size, contentType: r.contentType };
  }

  // 2) Sinon, on suppose un chemin de fichier local
  const filePath = path.resolve(String(input));
  const stat = await fs.stat(filePath);
  if (!stat.isFile()) throw new Error("Le chemin fourni n'est pas un fichier");

  const guessedType = mime.getType(filePath) || "application/octet-stream";
  const buffer = await fs.readFile(filePath);
  const finalName = opts.filename || makeSafeName(path.basename(filePath)) || `file_${Date.now()}`;
  const key = `${keyPrefix}/${finalName}`;

  const r = await putBuffer(key, buffer, guessedType);
  return { url: r.url, key: r.key, size: r.size, contentType: r.contentType };
}

/* ====================
 * Helpers
 * ==================== */
function makeSafeName(name: string) {
  return name
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "");
}

function buildFileName(filename?: string, contentType?: string) {
  const base = makeSafeName(filename || `file_${Date.now()}`);
  const hasExt = /\.[a-z0-9]{2,}$/i.test(base);
  if (hasExt) return base;

  const ext = extFromContentType(contentType);
  return ext ? `${base}${ext}` : base;
}

function extFromContentType(ct?: string) {
  if (!ct) return "";
  const ext = mime.getExtension(ct);
  return ext ? `.${ext}` : "";
}

function looksLikePath(s: string) {
  return s.includes("/") || s.includes("\\");
}
