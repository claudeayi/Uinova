// src/services/apiKeyService.ts
import { prisma } from "../utils/prisma";
import { nanoid } from "nanoid";

/**
 * Génère une nouvelle API key pour un user.
 */
export async function generateApiKey(userId: string) {
  const key = `uinova_${nanoid(32)}`;
  return prisma.apiKey.create({
    data: { userId, key },
  });
}

/**
 * Vérifie une API key.
 */
export async function verifyApiKey(key: string) {
  return prisma.apiKey.findUnique({ where: { key, active: true } });
}

/**
 * Révoque une API key.
 */
export async function revokeApiKey(key: string) {
  return prisma.apiKey.update({ where: { key }, data: { active: false } });
}
