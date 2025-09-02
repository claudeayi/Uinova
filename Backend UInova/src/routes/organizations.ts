import { Router } from "express";
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

const router = Router();

router.use(authenticate);

/* ============================================================================
 * ORGANIZATIONS
 * ========================================================================== */
router.get("/", listOrganizations);
router.get("/:id", getOrganization);
router.post("/", createOrganization);
router.patch("/:id", updateOrganization);
router.delete("/:id", deleteOrganization);

/* ============================================================================
 * MEMBERS & INVITES
 * ========================================================================== */
router.post("/:id/invite", inviteMember);
router.post("/invites/:inviteId/accept", acceptInvite);
router.delete("/:id/members/:userId", removeMember);
router.patch("/:id/members/:userId/role", changeRole);

export default router;
