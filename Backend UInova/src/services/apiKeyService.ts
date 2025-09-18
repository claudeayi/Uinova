// src/services/apiKeyService.ts
import { prisma } from "../utils/prisma";
import { nanoid } from "nanoid";
import { emitEvent } from "./eventBus";
import { auditLog } from "./auditLogService";
import { metrics } from "../utils/metrics";
import { logger } from "../utils/logger";
import { z } from "zod";

/* ============================================================================
 * Zod Schemas
 * ========================================================================== */
const apiKeyOptionsSchema = z.object({
  scopes: z.array(z.string()).optional(),
  expiresInDays: z.number().positive().optional(),
  meta: z.record(z.any()).optional(),
});

export interface ApiKeyOptions {
  scopes?: string[];
  expiresInDays?: number;
  meta?: Record<string, any>;
}

/* ============================================================================
 * Génération
 * ========================================================================== */
export async function generateApiKey(userId: string, options: ApiKeyOptions = {}) {
  try {
    const parsed = apiKeyOptionsSchema.parse(options);
    const key = `uinova_${nanoid(48)}`;

    const expiresAt = parsed.expiresInDays
      ? new Date(Date.now() + parsed.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const apiKey = await prisma.apiKey.create({
      data: {
        userId,
        key,
        active: true,
        scopes: parsed.scopes || ["*"],
        expiresAt,
        meta: parsed.meta || {},
      },
    });

    await auditLog.log(userId, "APIKEY_GENERATED", {
      keyId: apiKey.id,
      scopes: apiKey.scopes,
    });

    metrics.apiKeys.inc({ action: "generated" });
    emitEvent("apikey.generated", { userId, keyId: apiKey.id, scopes: apiKey.scopes });

    return apiKey;
  } catch (err: any) {
    logger.error("❌ generateApiKey error", err?.message);
    metrics.apiKeys.inc({ action: "error" });
    throw err;
  }
}

/* ============================================================================
 * Vérification
 * ========================================================================== */
export async function verifyApiKey(key: string, requiredScope?: string) {
  try {
    const apiKey = await prisma.apiKey.findUnique({ where: { key } });
    if (!apiKey || !apiKey.active) return null;

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return null; // expirée
    }

    if (requiredScope && !apiKey.scopes.includes("*") && !apiKey.scopes.includes(requiredScope)) {
      return null; // scope insuffisant
    }

    metrics.apiKeys.inc({ action: "verified" });
    return apiKey;
  } catch (err: any) {
    logger.error("❌ verifyApiKey error", err?.message);
    metrics.apiKeys.inc({ action: "error" });
    return null;
  }
}

/* ============================================================================
 * Révocation
 * ========================================================================== */
export async function revokeApiKey(key: string, byUserId?: string) {
  try {
    const apiKey = await prisma.apiKey.update({
      where: { key },
      data: { active: false },
    });

    await auditLog.log(byUserId || apiKey.userId, "APIKEY_REVOKED", { keyId: apiKey.id });
    emitEvent("apikey.revoked", { keyId: apiKey.id, userId: apiKey.userId });
    metrics.apiKeys.inc({ action: "revoked" });

    return apiKey;
  } catch (err: any) {
    logger.error("❌ revokeApiKey error", err?.message);
    metrics.apiKeys.inc({ action: "error" });
    throw err;
  }
}

/* ============================================================================
 * Rotation
 * ========================================================================== */
export async function rotateApiKey(key: string, byUserId?: string) {
  try {
    const oldKey = await prisma.apiKey.findUnique({ where: { key } });
    if (!oldKey) throw new Error("API_KEY_NOT_FOUND");

    await prisma.apiKey.update({ where: { id: oldKey.id }, data: { active: false } });

    const newKey = await generateApiKey(oldKey.userId, {
      scopes: oldKey.scopes as string[],
      expiresInDays: oldKey.expiresAt
        ? Math.ceil((oldKey.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : undefined,
      meta: oldKey.meta as Record<string, any>,
    });

    await auditLog.log(byUserId || oldKey.userId, "APIKEY_ROTATED", {
      oldKeyId: oldKey.id,
      newKeyId: newKey.id,
    });

    emitEvent("apikey.rotated", { oldKeyId: oldKey.id, newKeyId: newKey.id });
    metrics.apiKeys.inc({ action: "rotated" });

    return newKey;
  } catch (err: any) {
    logger.error("❌ rotateApiKey error", err?.message);
    metrics.apiKeys.inc({ action: "error" });
    throw err;
  }
}

/* ============================================================================
 * Gestion
 * ========================================================================== */
export async function listApiKeys(userId: string) {
  return prisma.apiKey.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function cleanupExpiredKeys() {
  try {
    const expired = await prisma.apiKey.findMany({
      where: { expiresAt: { lt: new Date() }, active: true },
    });

    for (const key of expired) {
      await prisma.apiKey.update({ where: { id: key.id }, data: { active: false } });
      await auditLog.log(key.userId, "APIKEY_EXPIRED", { keyId: key.id });
      emitEvent("apikey.expired", { keyId: key.id, userId: key.userId });
    }

    metrics.apiKeys.inc({ action: "expired" });
    return expired.length;
  } catch (err: any) {
    logger.error("❌ cleanupExpiredKeys error", err?.message);
    metrics.apiKeys.inc({ action: "error" });
    return 0;
  }
}
