// src/utils/hash.ts
import bcrypt from "bcryptjs";

/**
 * Config via .env
 * - BCRYPT_ROUNDS=12
 * - PASSWORD_PEPPER= (optionnel)
 */
const ROUNDS = Math.max(4, Number(process.env.BCRYPT_ROUNDS || 12));
const PEPPER = process.env.PASSWORD_PEPPER || "";

// Ajoute un “pepper” côté serveur (optionnel)
function withPepper(pwd: string): string {
  return `${pwd || ""}${PEPPER}`;
}

/**
 * Hash asynchrone (compatible await)
 */
export async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(ROUNDS);
  return bcrypt.hash(withPepper(plain), salt);
}

/**
 * Compare asynchrone (constant time)
 */
export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(withPepper(plain), hash);
  } catch {
    return false;
  }
}

/**
 * Indique si le hash devrait être régénéré avec plus de rounds (upgrade progressif)
 */
export function needsPasswordRehash(hash: string): boolean {
  const rounds = getRoundsFromHash(hash);
  return rounds > 0 && rounds < ROUNDS;
}

// Extrait le coût depuis un hash bcrypt ($2a$12$...)
function getRoundsFromHash(hash: string): number {
  const parts = (hash || "").split("$"); // ["", "2a", "12", "salt+hash"]
  const r = parseInt(parts[2], 10);
  return Number.isFinite(r) ? r : -1;
}

/**
 * Vérification simple de robustesse (sans dépendance)
 * - min 8 car.
 * - au moins 1 minuscule, 1 majuscule, 1 chiffre, 1 symbole
 */
export function assessPasswordStrength(pwd: string): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  if ((pwd || "").length < 8) issues.push("min_length");
  if (!/[a-z]/.test(pwd)) issues.push("lowercase");
  if (!/[A-Z]/.test(pwd)) issues.push("uppercase");
  if (!/[0-9]/.test(pwd)) issues.push("digit");
  if (!/[^A-Za-z0-9]/.test(pwd)) issues.push("symbol");
  return { ok: issues.length === 0, issues };
}
