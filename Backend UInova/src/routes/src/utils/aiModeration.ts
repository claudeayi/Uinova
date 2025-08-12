// src/utils/aiModeration.ts
/**
 * Modération locale (heuristique) pour UInova.
 * - Zéro dépendance
 * - Configurable via .env:
 *     AI_MOD_MAX_CHARS=1000
 *     AI_MOD_BLOCK_PII=1
 *     AI_MOD_BLOCK_URLS=0
 *     AI_MOD_STRICT=0
 */

export type ModCategory =
  | "NSFW"
  | "VIOLENCE"
  | "ILLEGAL"
  | "HATE"
  | "SELF_HARM"
  | "PII"
  | "SPAM"
  | "MALWARE"
  | "OTHER";

export type ModerationReport = {
  allowed: boolean;
  blockedCategories: ModCategory[];
  reasons: string[];
  flags: {
    hasUrl: boolean;
    hasEmail: boolean;
    hasPhone: boolean;
    tooLong: boolean;
    repeatedChars: boolean;
    codeBlock: boolean;
  };
  sanitized: string;         // prompt nettoyé (unicode NFKC, trim)
  masked: string;            // prompt avec vulgarités masquées
};

const MAX_CHARS = Number(process.env.AI_MOD_MAX_CHARS || 1000);
const BLOCK_PII = process.env.AI_MOD_BLOCK_PII === "1";
const BLOCK_URLS = process.env.AI_MOD_BLOCK_URLS === "1";
const STRICT = process.env.AI_MOD_STRICT === "1";

/** Listes basiques multi-langues (ajoute les tiens si besoin) */
const PROFANITY = [
  "fuck","shit","bitch","asshole","bastard",
  "pute","merde","salope","enculé","connard","fdp",
  "puta","mierda","pendejo",
];

const NSFW = [
  "nude","nudity","porn","porno","pornographie","pornograf",
  "sexe explicite","nsfw","xxx","x-rated","hardcore","physically sexual",
  "dick","boobs","seins nus","seins","penis","pénis","vagin","cum","orgasm",
];

const VIOLENCE = [
  "kill","murder","shoot","stab","bomb","explode","assassinat","assassiner","tuer","buter",
  "violence","massacre","décapiter","terrorisme","terrorist","genocide","génocide",
];

const ILLEGAL = [
  "hack","crack","pirater","piratage","keygen","warez","botnet","ddos","malware","ransomware",
  "buy fake","counterfeit","carte volée","stolen card",
];

const HATE = [
  "hate","haine","racist","racisme","nazi","supremacist","suprémaciste","ethnic cleansing","homophobe","islamophobe","antisémite",
];

const SELF_HARM = [
  "suicide","self harm","se faire du mal","me suicider","me tuer","kill myself","cut myself","autolyse",
];

const MALWARE = [
  "virus","trojan","keylogger","stealer","remote access tool","rat","backdoor",
];

const URL_RE = /\bhttps?:\/\/[^\s/$.?#].[^\s]*/i;
const EMAIL_RE = /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i;
const PHONE_RE = /\b(\+?\d[\d\s().-]{7,}\d)\b/;
const REPEAT_RE = /(.)\1{7,}/i;             // ex: "aaaaaaa"

function nfkc(s: string) {
  try { return s.normalize("NFKC"); } catch { return s; }
}

function clean(s: string) {
  return nfkc(s).replace(/\s+/g, " ").trim();
}

function containsFrom(list: string[], s: string) {
  const low = s.toLowerCase();
  return list.some(w => low.includes(w));
}

function maskProfanity(s: string) {
  let out = s;
  for (const w of PROFANITY) {
    const re = new RegExp(`\\b${escapeRegExp(w)}\\b`, "gi");
    out = out.replace(re, (m) => m[0] + "*".repeat(Math.max(0, m.length - 1)));
  }
  return out;
}

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Analyse et renvoie un rapport détaillé.
 */
export function moderatePromptDetailed(rawPrompt: string): ModerationReport {
  const sanitized = clean(rawPrompt || "");
  const lower = sanitized.toLowerCase();

  const flags = {
    hasUrl: URL_RE.test(sanitized),
    hasEmail: EMAIL_RE.test(sanitized),
    hasPhone: PHONE_RE.test(sanitized),
    tooLong: sanitized.length > MAX_CHARS,
    repeatedChars: REPEAT_RE.test(sanitized),
    codeBlock: /```/.test(sanitized),
  };

  const blocked: ModCategory[] = [];
  const reasons: string[] = [];

  // Longueur
  if (flags.tooLong) {
    blocked.push("OTHER");
    reasons.push(`Prompt trop long (> ${MAX_CHARS} caractères)`);
  }

  // Catégories sémantiques
  if (containsFrom(NSFW, lower)) { blocked.push("NSFW"); reasons.push("Contenu sexuel explicite interdit."); }
  if (containsFrom(VIOLENCE, lower)) { blocked.push("VIOLENCE"); reasons.push("Incitation à la violence interdite."); }
  if (containsFrom(ILLEGAL, lower)) { blocked.push("ILLEGAL"); reasons.push("Demande d’activité illégale interdite."); }
  if (containsFrom(HATE, lower)) { blocked.push("HATE"); reasons.push("Discours haineux interdit."); }
  if (containsFrom(SELF_HARM, lower)) { blocked.push("SELF_HARM"); reasons.push("Incitation à l’automutilation interdite."); }
  if (containsFrom(MALWARE, lower)) { blocked.push("MALWARE"); reasons.push("Aide à la création ou diffusion de malware interdite."); }

  // PII / SPAM
  const piiHit = flags.hasEmail || flags.hasPhone;
  if (piiHit && (BLOCK_PII || STRICT)) {
    blocked.push("PII");
    reasons.push("Données personnelles détectées (email/téléphone).");
  }
  if (flags.hasUrl && (BLOCK_URLS || STRICT)) {
    blocked.push("SPAM");
    reasons.push("Lien externe détecté.");
  }
  if (flags.repeatedChars && STRICT) {
    blocked.push("SPAM");
    reasons.push("Caractères répétés anormaux (spam).");
  }

  // Dédupe catégories
  const blockedUnique = [...new Set(blocked)];

  // Masquage profanité
  const masked = maskProfanity(sanitized);

  return {
    allowed: blockedUnique.length === 0,
    blockedCategories: blockedUnique,
    reasons,
    flags,
    sanitized,
    masked,
  };
}

/**
 * API simple (compat avec ton ancien contrôleur) :
 * - Renvoie true si prompt acceptable, false sinon.
 */
export function moderatePrompt(prompt: string): boolean {
  return moderatePromptDetailed(prompt).allowed;
}

/**
 * Helpers exportés (si tu veux les utiliser ailleurs)
 */
export function sanitizePrompt(prompt: string): string {
  return clean(prompt);
}

export function classifyPrompt(prompt: string): { categories: ModCategory[]; hasPII: boolean; hasUrl: boolean } {
  const r = moderatePromptDetailed(prompt);
  return {
    categories: r.blockedCategories,
    hasPII: r.flags.hasEmail || r.flags.hasPhone,
    hasUrl: r.flags.hasUrl,
  };
}
