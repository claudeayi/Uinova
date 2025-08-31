// src/routes/admin.ts
import { Router } from "express";
import { authenticate, authorize } from "../middlewares/security";
import { handleValidationErrors } from "../middlewares/validate";
import { checkSchema } from "express-validator";

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

/* ============================================================================
 *  VALIDATORS
 * ========================================================================== */
const validateIdParam = checkSchema(
  {
    id: {
      in: ["params"],
      custom: {
        options: (v) => typeof v === "string" && v.length > 5,
      },
      errorMessage: "Identifiant invalide",
    },
  },
  ["params"]
);

/* ============================================================================
 *  ADMIN ROUTES – toutes nécessitent authentification + rôle admin
 * ========================================================================== */
const router = Router();
router.use(authenticate, authorize(["admin"]));

/* ---------------- USERS ADMIN ---------------- */
router.get("/users", listUsers);
router.get("/users/:id", validateIdParam, handleValidationErrors, getUserById);
router.patch("/users/:id", validateIdParam, handleValidationErrors, updateUser);
router.delete("/users/:id", validateIdParam, handleValidationErrors, deleteUser);
router.post("/users/:id/suspend", validateIdParam, handleValidationErrors, suspendUser);

/* ---------------- PROJECTS ADMIN ---------------- */
router.get("/projects", listProjects);
router.get("/projects/:id", validateIdParam, handleValidationErrors, getProjectById);
router.delete("/projects/:id", validateIdParam, handleValidationErrors, deleteProject);
router.post("/projects/:id/validate", validateIdParam, handleValidationErrors, validateProject);

/* ---------------- MARKETPLACE ADMIN ---------------- */
router.get("/marketplace/items", listMarketplaceItems);
router.post("/marketplace/items/:id/validate", validateIdParam, handleValidationErrors, validateMarketplaceItem);
router.delete("/marketplace/items/:id", validateIdParam, handleValidationErrors, deleteMarketplaceItem);

/* ---------------- REPLAYS ADMIN ---------------- */
router.get("/replays", listReplaySessions);
router.get("/replays/:id", validateIdParam, handleValidationErrors, getReplayById);
router.delete("/replays/:id", validateIdParam, handleValidationErrors, deleteReplay);

/* ---------------- LOGS ADMIN ---------------- */
router.get("/logs", getLogs);

export default router;
