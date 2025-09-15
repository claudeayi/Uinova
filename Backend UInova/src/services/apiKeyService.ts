// src/services/apiKeyService.ts
import { prisma } from "../utils/prisma";
import { nanoid } from "nanoid";
import { emitEvent } from "./eventBus";

export interface ApiKeyOptions {
  scopes?: string[];     // ex: ["projects:read", "billing:write"]
  expiresInDays?: number; // ex: 30 → expire dans 30 jours
  meta?: Record<string, any>;
}

/* ============================================================================
 * Génération
 * ========================================================================== */
export async function generateApiKey(userId: string, options: ApiKeyOptions = {}) {
  const key = `uinova_${nanoid(48)}`;

  const expiresAt = options.expiresInDays
    ? new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  const apiKey = await prisma.apiKey.create({
    data: {
      userId,
      key,
      active: true,
      scopes: options.scopes || ["*"],
      expiresAt,
      meta: options.meta || {},
    },
  });

  await prisma.auditLog.create({
    data: { userId, action: "APIKEY_GENERATED", metadata: { keyId: apiKey.id, scopes: apiKey.scopes } },
  });

  emitEvent("apikey.generated", { userId, keyId: apiKey.id, scopes: apiKey.scopes });

  return apiKey;
}

/* ============================================================================
 * Vérification
 * ========================================================================== */
export async function verifyApiKey(key: string, requiredScope?: string) {
  const apiKey = await prisma.apiKey.findUnique({ where: { key } });
  if (!apiKey || !apiKey.active) return null;

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return null; // expirée
  }

  if (requiredScope && !apiKey.scopes.includes("*") && !apiKey.scopes.includes(requiredScope)) {
    return null; // scope insuffisant
  }

  return apiKey;
}

/* ============================================================================
 * Révocation
 * ========================================================================== */
export async function revokeApiKey(key: string, byUserId?: string) {
  const apiKey = await prisma.apiKey.update({
    where: { key },
    data: { active: false },
  });

  await prisma.auditLog.create({
    data: {
      userId: byUserId || apiKey.userId,
      action: "APIKEY_REVOKED",
      metadata: { keyId: apiKey.id },
    },
  });

  emitEvent("apikey.revoked", { keyId: apiKey.id, userId: apiKey.userId });

  return apiKey;
}

/* ============================================================================
 * Rotation
 * ========================================================================== */
export async function rotateApiKey(key: string, byUserId?: string) {
  const oldKey = await prisma.apiKey.findUnique({ where: { key } });
  if (!oldKey) throw new Error("API_KEY_NOT_FOUND");

  // Révoquer l’ancienne
  await prisma.apiKey.update({ where: { id: oldKey.id }, data: { active: false } });

  // Générer une nouvelle avec les mêmes scopes/meta
  const newKey = await generateApiKey(oldKey.userId, {
    scopes: oldKey.scopes as string[],
    expiresInDays: oldKey.expiresAt
      ? Math.ceil((oldKey.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : undefined,
    meta: oldKey.meta as Record<string, any>,
  });

  await prisma.auditLog.create({
    data: {
      userId: byUserId || oldKey.userId,
      action: "APIKEY_ROTATED",
      metadata: { oldKeyId: oldKey.id, newKeyId: newKey.id },
    },
  });

  emitEvent("apikey.rotated", { oldKeyId: oldKey.id, newKeyId: newKey.id });

  return newKey;
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
  const expired = await prisma.apiKey.findMany({
    where: { expiresAt: { lt: new Date() }, active: true },
  });

  for (const key of expired) {
    await prisma.apiKey.update({ where: { id: key.id }, data: { active: false } });
    emitEvent("apikey.expired", { keyId: key.id, userId: key.userId });
  }

  return expired.length;
}
