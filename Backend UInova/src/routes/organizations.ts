// src/routes/organizations.ts
import { Router } from "express";
import { body, param } from "express-validator";
import { authenticate, authorize } from "../middlewares/security";
import {
  listOrganizations,
  getOrganization,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  inviteMember,
  acceptInvite,
  removeMember,
  changeRole,
} from "../controllers/organizationController";
import { handleValidationErrors } from "../middlewares/validate";

const router = Router();

/* ============================================================================
 * ORGANIZATIONS – Auth Required
 * ========================================================================== */
router.use(authenticate);

/**
 * GET /api/organizations
 * ▶️ Liste les organisations de l’utilisateur connecté
 */
router.get("/", listOrganizations);

/**
 * GET /api/organizations/:id
 * ▶️ Récupère une organisation (si membre ou admin)
 */
router.get(
  "/:id",
  param("id").isString().isLength({ min: 8 }).withMessage("id invalide"),
  handleValidationErrors,
  getOrganization
);

/**
 * POST /api/organizations
 * ▶️ Crée une nouvelle organisation
 */
router.post(
  "/",
  body("name")
    .isString()
    .isLength({ min: 3, max: 100 })
    .withMessage("Nom d’organisation invalide"),
  handleValidationErrors,
  createOrganization
);

/**
 * PATCH /api/organizations/:id
 * ▶️ Met à jour une organisation
 */
router.patch(
  "/:id",
  param("id").isString().isLength({ min: 8 }).withMessage("id invalide"),
  body("name").optional().isString().isLength({ min: 3, max: 100 }),
  handleValidationErrors,
  updateOrganization
);

/**
 * DELETE /api/organizations/:id
 * ▶️ Supprime une organisation (OWNER ou ADMIN only)
 */
router.delete(
  "/:id",
  param("id").isString().isLength({ min: 8 }).withMessage("id invalide"),
  handleValidationErrors,
  authorize(["ADMIN", "OWNER"]),
  deleteOrganization
);

/* ============================================================================
 * MEMBERS & INVITES
 * ========================================================================== */

/**
 * POST /api/organizations/:id/invite
 * ▶️ Invite un membre (OWNER ou ADMIN only)
 * Body: { email: string, role?: "MEMBER"|"ADMIN" }
 */
router.post(
  "/:id/invite",
  param("id").isString().isLength({ min: 8 }).withMessage("id invalide"),
  body("email").isEmail().withMessage("Email invalide"),
  body("role")
    .optional()
    .isIn(["MEMBER", "ADMIN"])
    .withMessage("Rôle invalide"),
  handleValidationErrors,
  inviteMember
);

/**
 * POST /api/organizations/invites/:inviteId/accept
 * ▶️ Accepte une invitation
 */
router.post(
  "/invites/:inviteId/accept",
  param("inviteId").isString().isLength({ min: 10 }).withMessage("inviteId invalide"),
  handleValidationErrors,
  acceptInvite
);

/**
 * DELETE /api/organizations/:id/members/:userId
 * ▶️ Retire un membre (OWNER ou ADMIN only)
 */
router.delete(
  "/:id/members/:userId",
  param("id").isString().isLength({ min: 8 }).withMessage("id invalide"),
  param("userId").isString().isLength({ min: 8 }).withMessage("userId invalide"),
  handleValidationErrors,
  authorize(["ADMIN", "OWNER"]),
  removeMember
);

/**
 * PATCH /api/organizations/:id/members/:userId/role
 * ▶️ Change le rôle d’un membre (OWNER only)
 */
router.patch(
  "/:id/members/:userId/role",
  param("id").isString().isLength({ min: 8 }).withMessage("id invalide"),
  param("userId").isString().isLength({ min: 8 }).withMessage("userId invalide"),
  body("role").isIn(["MEMBER", "ADMIN"]).withMessage("Rôle invalide"),
  handleValidationErrors,
  authorize(["OWNER"]),
  changeRole
);

export default router;
