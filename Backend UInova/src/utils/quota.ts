/**
 * Mémoire temporaire pour suivre l'utilisation des fonctionnalités par utilisateur.
 * Structure : { userId: { feature: count } }
 */
const memoryQuota: Record<string, Record<string, number>> = {};

/**
 * Vérifie si un utilisateur a atteint la limite d'utilisation d'une fonctionnalité.
 * Incrémente le compteur à chaque appel.
 *
 * @param userId - Identifiant unique de l'utilisateur
 * @param feature - Nom de la fonctionnalité
 * @param limit - Limite maximale d'utilisation (par défaut : 100)
 * @returns true si l'utilisateur est encore dans la limite, sinon false
 */
export function checkQuota(userId: string, feature: string, limit = 100): boolean {
  if (!memoryQuota[userId]) {
    memoryQuota[userId] = {};
  }

  memoryQuota[userId][feature] = (memoryQuota[userId][feature] || 0) + 1;

  return memoryQuota[userId][feature] <= limit;
}

/**
 * Réinitialise le compteur d'une fonctionnalité pour un utilisateur
 * (utile après un reset de quota journalier par exemple)
 *
 * @param userId - Identifiant unique de l'utilisateur
 * @param feature - Nom de la fonctionnalité
 */
export function resetQuota(userId: string, feature: string): void {
  if (memoryQuota[userId]) {
    memoryQuota[userId][feature] = 0;
  }
}

/**
 * Récupère le compteur actuel d'une fonctionnalité pour un utilisateur
 *
 * @param userId - Identifiant unique de l'utilisateur
 * @param feature - Nom de la fonctionnalité
 * @returns Nombre d'utilisations actuelles
 */
export function getQuotaUsage(userId: string, feature: string): number {
  return memoryQuota[userId]?.[feature] || 0;
}
