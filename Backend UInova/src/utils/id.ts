import { randomBytes } from "crypto";

/**
 * Génère un identifiant unique hexadécimal
 * @param length Longueur en bytes (16 par défaut)
 * @returns Identifiant unique sous forme hexadécimale
 */
export function generateId(length = 16): string {
  return randomBytes(length).toString("hex");
}

/**
 * Génère un code court alphanumérique en majuscules
 * @param len Longueur du code (6 par défaut)
 * @returns Code court en majuscules
 */
export function generateShortCode(len = 6): string {
  return Math.random()
    .toString(36)
    .substring(2, 2 + len)
    .toUpperCase();
}
