import { Router } from "express";
import {
  listUsers,
  getUserById,
  updateUser,
  deleteUser,
  suspendUser,
} from "../controllers/admin/usersAdminController";

import {
  listProjects,
  getProjectById,
  deleteProject,
  validateProject,
} from "../controllers/admin/projectsAdminController";

import {
  listMarketplaceItems,
  validateMarketplaceItem,
  deleteMarketplaceItem,
} from "../controllers/admin/marketplaceAdminController";

import {
  listReplaySessions,
  getReplayById,
  deleteReplay,
} from "../controllers/admin/replaysAdminController";

import { getLogs } from "../controllers/monitoringController";
import { authenticate, authorize } from "../middlewares/security";

const router = Router();

/* ============================================================================
 *  ADMIN ROUTES – nécessitent authentification + rôle "admin"
 * ========================================================================== */

router.use(authenticate, authorize(["admin"]));

/* ---------------- USERS ADMIN ---------------- */
router.get("/users", listUsers);
router.get("/users/:id", getUserById);
router.patch("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);
router.post("/users/:id/suspend", suspendUser);

/* ---------------- PROJECTS ADMIN ---------------- */
router.get("/projects", listProjects);
router.get("/projects/:id", getProjectById);
router.delete("/projects/:id", deleteProject);
router.post("/projects/:id/validate", validateProject);

/* ---------------- MARKETPLACE ADMIN ---------------- */
router.get("/marketplace/items", listMarketplaceItems);
router.post("/marketplace/items/:id/validate", validateMarketplaceItem);
router.delete("/marketplace/items/:id", deleteMarketplaceItem);

/* ---------------- REPLAYS ADMIN ---------------- */
router.get("/replays", listReplaySessions);
router.get("/replays/:id", getReplayById);
router.delete("/replays/:id", deleteReplay);

/* ---------------- LOGS ADMIN ---------------- */
router.get("/logs", getLogs);

export default router;
