import { Router } from "express";
import { authenticate } from "../middlewares/security";
import {
  createOrganization,
  listOrganizations,
  getOrganization,
  inviteMember,
  acceptInvite,
  removeMember,
  updateOrganization,
} from "../controllers/orgController";

const router = Router();
router.use(authenticate);

// CRUD Orgs
router.post("/", createOrganization);
router.get("/", listOrganizations);
router.get("/:orgId", getOrganization);
router.patch("/:orgId", updateOrganization);

// Members & Invites
router.post("/:orgId/invite", inviteMember);
router.post("/invites/:token/accept", acceptInvite);
router.delete("/:orgId/members/:userId", removeMember);

export default router;
