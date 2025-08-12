// src/utils/helpers.ts

/** Convertit en objet Date valide ou renvoie null */
export function toDateSafe(d: Date | string | number | null | undefined): Date | null {
  if (d instanceof Date) return isNaN(d.getTime()) ? null : d;
  if (d === null || d === undefined) return null;
  const t = new Date(d as any);
  return isNaN(t.getTime()) ? null : t;
}

/**
 * Formate une date localisée (par défaut fr-FR).
 * Options courantes :
 *  - timeZone: ex. "UTC" | "Europe/Paris"
 *  - withSeconds: ajoute les secondes
 *  - dateStyle/timeStyle: "short" | "medium" | "long" | "full"
 */
export function formatDate(
  date: Date | string | number,
  opts: {
    locale?: string;
    timeZone?: string;
    withSeconds?: boolean;
    dateStyle?: "short" | "medium" | "long" | "full";
    timeStyle?: "short" | "medium" | "long" | "full";
  } = {}
): string {
  const d = toDateSafe(date);
  if (!d) return "";
  const {
    locale = "fr-FR",
    timeZone,
    withSeconds = false,
    dateStyle = "short",
    timeStyle = "short",
  } = opts;
  const base: Intl.DateTimeFormatOptions = { dateStyle, timeStyle, timeZone };
  if (withSeconds) base.second = "2-digit";
  return new Intl.DateTimeFormat(locale, base).format(d);
}

/** Renvoie une date ISO (UTC) sûre pour l’API / la DB */
export function formatISO(date: Date | string | number): string {
  const d = toDateSafe(date);
  return d ? d.toISOString() : "";
}

/** Email regex robuste (RFC5322-lite) + garde-fous de longueur/domain */
export function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  const e = email.trim();
  // parts
  const at = e.lastIndexOf("@");
  if (at <= 0 || at === e.length - 1) return false;
  const local = e.slice(0, at);
  const domain = e.slice(at + 1);

  // local part: pas d'espaces, pas de doubles points, long max 64
  if (local.length === 0 || local.length > 64) return false;
  if (/^\./.test(local) || /\.$/.test(local) || /\.\./.test(local)) return false;
  if (!/^[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+$/.test(local)) return false;

  // domain: labels séparés par '.', pas de tiret au début/fin, TLD >= 2
  if (domain.length === 0) return false;
  const labels = domain.split(".");
  if (labels.some(l => l.length === 0)) return false;
  if (!/^[A-Za-z0-9.-]+$/.test(domain)) return false;
  if (labels.some(l => /^-|-$/ .test(l))) return false;
  const tld = labels[labels.length - 1];
  if (tld.length < 2) return false;

  // forme générale
  const rfcLite = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return rfcLite.test(e);
}

/** Normalise un email (trim + lowercase) pour stockage et recherche */
export function normalizeEmail(email: string): string {
  return (email || "").trim().toLowerCase();
}

/** Chaîne non vide après trim */
export function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

/** UUID v4 simple */
export function isValidUUID(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

/** Clamp numérique */
export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** Pagination utilitaire pour lire des query params */
export function parsePagination(q: any, defPage = 1, defSize = 20, maxSize = 200) {
  const page = Math.max(1, parseInt(String(q?.page ?? defPage), 10) || defPage);
  const pageSize = clamp(parseInt(String(q?.pageSize ?? defSize), 10) || defSize, 1, maxSize);
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

/** Sleep (utile en tests) */
export function sleep(ms: number) {
  return new Promise(res => setTimeout(res, ms));
}

/** Pick/omit utilitaires */
export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const out = {} as Pick<T, K>;
  for (const k of keys) if (k in obj) (out as any)[k] = obj[k];
  return out;
}
export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const set = new Set(keys);
  const out: any = {};
  for (const k in obj) if (!set.has(k as any)) out[k] = (obj as any)[k];
  return out as Omit<T, K>;
}
