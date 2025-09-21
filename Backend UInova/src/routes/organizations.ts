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
import client from "prom-client";
import { auditLog } from "../services/auditLogService";
import { emitEvent } from "../services/eventBus";

const router = Router();

/* ============================================================================
 * 📊 Prometheus metrics
 * ========================================================================== */
const counterOrgActions = new client.Counter({
  name: "uinova_organizations_actions_total",
  help: "Compteur des actions sur les organisations",
  labelNames: ["action"],
});

/* ============================================================================
 * ORGANIZATIONS – Auth Required
 * ========================================================================== */
router.use(authenticate);

/**
 * GET /api/organizations
 */
router.get("/", async (req, res, next) => {
  const result = await listOrganizations(req, res, next);
  counterOrgActions.inc({ action: "list" });
  return result;
});

/**
 * GET /api/organizations/:id
 */
router.get(
  "/:id",
  param("id").isString().isLength({ min: 8 }).withMessage("id invalide"),
  handleValidationErrors,
  async (req, res, next) => {
    const result = await getOrganization(req, res, next);
    counterOrgActions.inc({ action: "get" });
    return result;
  }
);

/**
 * POST /api/organizations
 */
router.post(
  "/",
  body("name").isString().isLength({ min: 3, max: 100 }).withMessage("Nom d’organisation invalide"),
  handleValidationErrors,
  async (req, res, next) => {
    const result = await createOrganization(req, res, next);
    counterOrgActions.inc({ action: "create" });
    await auditLog.log(req.user?.id, "ORG_CREATED", { name: req.body.name });
    emitEvent("organization.created", { userId: req.user?.id, name: req.body.name });
    return result;
  }
);

/**
 * PATCH /api/organizations/:id
 */
router.patch(
  "/:id",
  param("id").isString().isLength({ min: 8 }).withMessage("id invalide"),
  body("name").optional().isString().isLength({ min: 3, max: 100 }),
  handleValidationErrors,
  async (req, res, next) => {
    const result = await updateOrganization(req, res, next);
    counterOrgActions.inc({ action: "update" });
    await auditLog.log(req.user?.id, "ORG_UPDATED", { id: req.params.id, changes: req.body });
    emitEvent("organization.updated", { id: req.params.id, userId: req.user?.id });
    return result;
  }
);

/**
 * DELETE /api/organizations/:id
 */
router.delete(
  "/:id",
  param("id").isString().isLength({ min: 8 }).withMessage("id invalide"),
  handleValidationErrors,
  authorize(["ADMIN", "OWNER"]),
  async (req, res, next) => {
    const result = await deleteOrganization(req, res, next);
    counterOrgActions.inc({ action: "delete" });
    await auditLog.log(req.user?.id, "ORG_DELETED", { id: req.params.id });
    emitEvent("organization.deleted", { id: req.params.id, userId: req.user?.id });
    return result;
  }
);

/* ============================================================================
 * MEMBERS & INVITES
 * ========================================================================== */

/**
 * POST /api/organizations/:id/invite
 */
router.post(
  "/:id/invite",
  param("id").isString().isLength({ min: 8 }).withMessage("id invalide"),
  body("email").isEmail().withMessage("Email invalide"),
  body("role").optional().isIn(["MEMBER", "ADMIN"]).withMessage("Rôle invalide"),
  handleValidationErrors,
  async (req, res, next) => {
    const result = await inviteMember(req, res, next);
    counterOrgActions.inc({ action: "invite" });
    await auditLog.log(req.user?.id, "ORG_MEMBER_INVITED", { id: req.params.id, email: req.body.email });
    emitEvent("organization.member.invited", { orgId: req.params.id, email: req.body.email });
    return result;
  }
);

/**
 * POST /api/organizations/invites/:inviteId/accept
 */
router.post(
  "/invites/:inviteId/accept",
  param("inviteId").isString().isLength({ min: 10 }).withMessage("inviteId invalide"),
  handleValidationErrors,
  async (req, res, next) => {
    const result = await acceptInvite(req, res, next);
    counterOrgActions.inc({ action: "acceptInvite" });
    await auditLog.log(req.user?.id, "ORG_INVITE_ACCEPTED", { inviteId: req.params.inviteId });
    emitEvent("organization.invite.accepted", { inviteId: req.params.inviteId, userId: req.user?.id });
    return result;
  }
);

/**
 * DELETE /api/organizations/:id/members/:userId
 */
router.delete(
  "/:id/members/:userId",
  param("id").isString().isLength({ min: 8 }).withMessage("id invalide"),
  param("userId").isString().isLength({ min: 8 }).withMessage("userId invalide"),
  handleValidationErrors,
  authorize(["ADMIN", "OWNER"]),
  async (req, res, next) => {
    const result = await removeMember(req, res, next);
    counterOrgActions.inc({ action: "removeMember" });
    await auditLog.log(req.user?.id, "ORG_MEMBER_REMOVED", { orgId: req.params.id, userId: req.params.userId });
    emitEvent("organization.member.removed", { orgId: req.params.id, userId: req.params.userId });
    return result;
  }
);

/**
 * PATCH /api/organizations/:id/members/:userId/role
 */
router.patch(
  "/:id/members/:userId/role",
  param("id").isString().isLength({ min: 8 }).withMessage("id invalide"),
  param("userId").isString().isLength({ min: 8 }).withMessage("userId invalide"),
  body("role").isIn(["MEMBER", "ADMIN"]).withMessage("Rôle invalide"),
  handleValidationErrors,
  authorize(["OWNER"]),
  async (req, res, next) => {
    const result = await changeRole(req, res, next);
    counterOrgActions.inc({ action: "changeRole" });
    await auditLog.log(req.user?.id, "ORG_MEMBER_ROLE_CHANGED", {
      orgId: req.params.id,
      userId: req.params.userId,
      role: req.body.role,
    });
    emitEvent("organization.member.roleChanged", {
      orgId: req.params.id,
      userId: req.params.userId,
      role: req.body.role,
    });
    return result;
  }
);

export default router;
