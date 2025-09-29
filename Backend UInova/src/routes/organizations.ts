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

const histogramOrgLatency = new client.Histogram({
  name: "uinova_organizations_latency_ms",
  help: "Latence des opérations sur les organisations",
  labelNames: ["action", "status"],
  buckets: [20, 50, 100, 200, 500, 1000, 2000],
});

function withMetrics(action: string, handler: any) {
  return async (req: any, res: any, next: any) => {
    const start = Date.now();
    try {
      const result = await handler(req, res, next);
      counterOrgActions.inc({ action });
      histogramOrgLatency.labels(action, "success").observe(Date.now() - start);
      return result;
    } catch (err) {
      histogramOrgLatency.labels(action, "error").observe(Date.now() - start);
      throw err;
    }
  };
}

/* ============================================================================
 * ORGANIZATIONS – Auth Required
 * ========================================================================== */
router.use(authenticate);

/**
 * GET /api/organizations
 */
router.get("/", withMetrics("list", listOrganizations));

/**
 * GET /api/organizations/:id
 */
router.get(
  "/:id",
  param("id").isString().isLength({ min: 8 }).withMessage("id invalide"),
  handleValidationErrors,
  withMetrics("get", getOrganization)
);

/**
 * POST /api/organizations
 */
router.post(
  "/",
  body("name").isString().isLength({ min: 3, max: 100 }).withMessage("Nom d’organisation invalide"),
  handleValidationErrors,
  withMetrics("create", async (req, res, next) => {
    const result = await createOrganization(req, res, next);
    await auditLog.log(req.user?.id, "ORG_CREATED", { name: req.body.name });
    emitEvent("organization.created", { userId: req.user?.id, name: req.body.name });
    return result;
  })
);

/**
 * PATCH /api/organizations/:id
 */
router.patch(
  "/:id",
  param("id").isString().isLength({ min: 8 }).withMessage("id invalide"),
  body("name").optional().isString().isLength({ min: 3, max: 100 }),
  handleValidationErrors,
  withMetrics("update", async (req, res, next) => {
    const result = await updateOrganization(req, res, next);
    await auditLog.log(req.user?.id, "ORG_UPDATED", { id: req.params.id, changes: req.body });
    emitEvent("organization.updated", { id: req.params.id, userId: req.user?.id });
    return result;
  })
);

/**
 * DELETE /api/organizations/:id
 */
router.delete(
  "/:id",
  param("id").isString().isLength({ min: 8 }).withMessage("id invalide"),
  handleValidationErrors,
  authorize(["ADMIN", "OWNER"]),
  withMetrics("delete", async (req, res, next) => {
    const result = await deleteOrganization(req, res, next);
    await auditLog.log(req.user?.id, "ORG_DELETED", { id: req.params.id });
    emitEvent("organization.deleted", { id: req.params.id, userId: req.user?.id });
    return result;
  })
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
  withMetrics("invite", async (req, res, next) => {
    const result = await inviteMember(req, res, next);
    await auditLog.log(req.user?.id, "ORG_MEMBER_INVITED", { id: req.params.id, email: req.body.email });
    emitEvent("organization.member.invited", { orgId: req.params.id, email: req.body.email });
    return result;
  })
);

/**
 * POST /api/organizations/invites/:inviteId/accept
 */
router.post(
  "/invites/:inviteId/accept",
  param("inviteId").isString().isLength({ min: 10 }).withMessage("inviteId invalide"),
  handleValidationErrors,
  withMetrics("acceptInvite", async (req, res, next) => {
    const result = await acceptInvite(req, res, next);
    await auditLog.log(req.user?.id, "ORG_INVITE_ACCEPTED", { inviteId: req.params.inviteId });
    emitEvent("organization.invite.accepted", { inviteId: req.params.inviteId, userId: req.user?.id });
    return result;
  })
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
  withMetrics("removeMember", async (req, res, next) => {
    const result = await removeMember(req, res, next);
    await auditLog.log(req.user?.id, "ORG_MEMBER_REMOVED", { orgId: req.params.id, userId: req.params.userId });
    emitEvent("organization.member.removed", { orgId: req.params.id, userId: req.params.userId });
    return result;
  })
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
  withMetrics("changeRole", async (req, res, next) => {
    const result = await changeRole(req, res, next);
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
  })
);

export default router;
