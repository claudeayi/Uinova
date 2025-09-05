import { Request, Response, NextFunction } from "express";
import { checkSchema, validationResult, ParamSchema, Schema } from "express-validator";

/* ============================================================================
 * HELPERS & FORMAT D’ERREUR
 * ========================================================================== */
export function handleValidationErrors(req: Request, res: Response, next: NextFunction) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const details = result.array({ onlyFirstError: true }).map(e => ({
    field: e.type === "field" ? e.path : undefined,
    message: e.msg,
    location: e.location,
    value: e.value,
  }));

  return res.status(400).json({
    error: "VALIDATION_ERROR",
    message: "Requête invalide",
    details,
  });
}

// Détecte id string (cuid/uuid) OU numérique
const isId: ParamSchema["custom"] = {
  options: (v) => {
    if (v === undefined || v === null) return false;
    if (typeof v === "number") return Number.isFinite(v);
    if (typeof v === "string") {
      if (/^\d+$/.test(v)) return true;                 // numérique
      if (/^c[a-z0-9]{24,}$/i.test(v)) return true;     // cuid-like
      if (/^[0-9a-f-]{10,}$/i.test(v)) return true;     // uuid-like
    }
    return false;
  },
  errorMessage: "Identifiant invalide",
};

const isJsonLike: ParamSchema["custom"] = {
  options: (v) => v === undefined || typeof v === "object" || Array.isArray(v),
  errorMessage: "Format JSON attendu",
};

const optString: ParamSchema = {
  optional: { options: { nullable: true } },
  isString: { errorMessage: "Doit être une chaîne" },
  trim: true,
};

export const paginationQuery: Schema = {
  page: {
    in: ["query"],
    optional: true,
    toInt: true,
    isInt: { options: { min: 1 }, errorMessage: "page doit être ≥ 1" },
    default: 1,
  },
  pageSize: {
    in: ["query"],
    optional: true,
    toInt: true,
    isInt: { options: { min: 1, max: 100 }, errorMessage: "pageSize doit être 1..100" },
    default: 20,
  },
};

/* ============================================================================
 * AUTH
 * ========================================================================== */
export const validateRegister = checkSchema(
  {
    email: { in: ["body"], isEmail: { errorMessage: "Email invalide" }, normalizeEmail: true },
    password: { in: ["body"], isLength: { options: { min: 6 }, errorMessage: "Mot de passe trop court" } },
    displayName: { in: ["body"], ...optString, isLength: { options: { min: 2, max: 80 }, errorMessage: "Nom affiché invalide" } },
  },
  ["body"]
);

export const validateLogin = checkSchema(
  {
    email: { in: ["body"], isEmail: { errorMessage: "Email invalide" }, normalizeEmail: true },
    password: { in: ["body"], isString: { errorMessage: "Mot de passe requis" }, notEmpty: { errorMessage: "Mot de passe requis" } },
  },
  ["body"]
);

/* ============================================================================
 * PROJECTS
 * ========================================================================== */
export const validateListProjectsQuery = checkSchema(
  {
    ...paginationQuery,
    status: {
      in: ["query"],
      optional: true,
      isIn: { options: [["EN_COURS", "TERMINE", "PLANIFIE"]] },
      errorMessage: "status invalide",
    },
    q: { in: ["query"], optional: true, trim: true, isLength: { options: { min: 1, max: 120 }, errorMessage: "q invalide" } },
    sort: {
      in: ["query"],
      optional: true,
      isIn: { options: [["updatedAt:desc","updatedAt:asc","name:asc","name:desc"]] },
      default: "updatedAt:desc",
    },
  },
  ["query"]
);

export const validateProjectCreate = checkSchema(
  {
    name: { in: ["body"], isString: true, notEmpty: { errorMessage: "Le nom est obligatoire" }, trim: true, isLength: { options: { max: 120 }, errorMessage: "Nom trop long" } },
    tagline: { in: ["body"], ...optString, isLength: { options: { max: 200 }, errorMessage: "Tagline trop longue" } },
    icon: { in: ["body"], ...optString, isLength: { options: { max: 120 }, errorMessage: "Icon invalide" } },
    status: { in: ["body"], optional: true, isIn: { options: [["EN_COURS", "TERMINE", "PLANIFIE"]] }, errorMessage: "status invalide" },
    schema: { in: ["body"], optional: true, custom: isJsonLike },
  },
  ["body"]
);

export const validateProjectUpdate = checkSchema(
  {
    name: { in: ["body"], optional: true, isString: true, trim: true, isLength: { options: { max: 120 }, errorMessage: "Nom trop long" } },
    tagline: { in: ["body"], optional: true, isString: true, trim: true, isLength: { options: { max: 200 }, errorMessage: "Tagline trop longue" } },
    icon: { in: ["body"], optional: true, isString: true, trim: true, isLength: { options: { max: 120 }, errorMessage: "Icon invalide" } },
    status: { in: ["body"], optional: true, isIn: { options: [["EN_COURS", "TERMINE", "PLANIFIE"]] }, errorMessage: "status invalide" },
    schema: { in: ["body"], optional: true, custom: isJsonLike },
  },
  ["body"]
);

/* ============================================================================
 * PAGES
 * ========================================================================== */
export const validateProjectIdParam = checkSchema({ projectId: { in: ["params"], custom: isId } }, ["params"]);
export const validatePageIdParam = checkSchema({ id: { in: ["params"], custom: isId } }, ["params"]);

export const validatePageCreate = checkSchema(
  {
    name: { in: ["body"], isString: true, notEmpty: { errorMessage: "Le nom est obligatoire" }, trim: true, isLength: { options: { max: 120 }, errorMessage: "Nom trop long" } },
    schema: { in: ["body"], optional: true, custom: isJsonLike },
    data: { in: ["body"], optional: true, custom: isJsonLike }, // compat ancien champ
  },
  ["body"]
);

export const validatePageUpdate = checkSchema(
  {
    name: { in: ["body"], optional: true, isString: true, trim: true, isLength: { options: { max: 120 }, errorMessage: "Nom trop long" } },
    schema: { in: ["body"], optional: true, custom: isJsonLike },
    data: { in: ["body"], optional: true, custom: isJsonLike },
  },
  ["body"]
);

export const validatePagesReorder = checkSchema(
  {
    items: { in: ["body"], isArray: { options: { min: 1 }, errorMessage: "items doit être un tableau non vide" } },
    "items.*.id": { in: ["body"], custom: isId },
    "items.*.sortOrder": { in: ["body"], toInt: true, isInt: { options: { min: 0, max: 1_000_000 }, errorMessage: "sortOrder invalide" } },
  },
  ["body"]
);

/* ============================================================================
 * EXPORTS
 * ========================================================================== */
export const validateExportSave = checkSchema(
  {
    type: { in: ["body"], isIn: { options: [["react", "html", "flutter", "pwa"]] }, errorMessage: "type export invalide" },
    content: { in: ["body"], optional: true, isString: { errorMessage: "content doit être une chaîne (base64/HTML)" } },
    strategy: { in: ["body"], optional: true, isIn: { options: [["direct", "enqueue"]], errorMessage: "strategy invalide" } },
    meta: { in: ["body"], optional: true, custom: isJsonLike },
  },
  ["body"]
);

export const validateExportListQuery = checkSchema(
  {
    ...paginationQuery,
    projectId: { in: ["query"], optional: true, custom: isId },
    pageId: { in: ["query"], optional: true, custom: isId },
    type: { in: ["query"], optional: true, isIn: { options: [["react", "html", "flutter", "pwa"]] }, errorMessage: "type invalide" },
    status: { in: ["query"], optional: true, isIn: { options: [["pending", "ready", "failed"]] }, errorMessage: "status invalide" },
    sort: { in: ["query"], optional: true, isIn: { options: [["createdAt:desc","createdAt:asc"]] }, default: "createdAt:desc" },
  },
  ["query"]
);

/* ============================================================================
 * PAYMENTS (Stripe, PayPal, CinetPay…)
 * ========================================================================== */
export const validateStripeIntent = checkSchema(
  {
    priceId: { in: ["body"], optional: true, isString: true, trim: true },
    quantity: { in: ["body"], optional: true, toInt: true, isInt: { options: { min: 1, max: 100 }, errorMessage: "quantity invalide" } },
    amount: { in: ["body"], optional: true, toInt: true, isInt: { options: { min: 100, max: 2_000_000 }, errorMessage: "amount invalide (centimes)" } },
    currency: { in: ["body"], optional: true, isString: true, trim: true, isLength: { options: { min: 3, max: 3 }, errorMessage: "currency invalide" }, default: "eur" },
    description: { in: ["body"], optional: true, isString: true, trim: true, isLength: { options: { max: 200 }, errorMessage: "description trop longue" } },
    orgId: { in: ["body"], optional: true, isString: true, trim: true },
    projectId: { in: ["body"], optional: true, isString: true, trim: true },
    idempotencyKey: { in: ["body"], optional: true, isUUID: { errorMessage: "idempotencyKey invalide" } },
  },
  ["body"]
);

/* ============================================================================
 * BADGES
 * ========================================================================== */
export const validateBadgeGive = checkSchema(
  {
    type: {
      in: ["body"],
      isIn: { options: [["EARLY_ADOPTER","PRO_USER","COMMUNITY_HELPER","TOP_CREATOR"]] },
      errorMessage: "Type de badge invalide",
    },
    userId: { in: ["body"], custom: isId },
  },
  ["body"]
);
