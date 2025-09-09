// src/routes/admin.ts
import { Router } from "express";
import { param, query } from "express-validator";

import {
  listUsers,
  getUserById,
  updateUser,
  deleteUser,
  suspendUser,
  getUserStats,
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

import {
  getLogs,
  purgeLogs,
} from "../controllers/monitoringController";

import { authenticate, authorize } from "../middlewares/security";
import { handleValidationErrors } from "../middlewares/validate";

const router = Router();

/* ============================================================================
 *  ADMIN ROUTES – nécessitent authentification + rôle "admin"
 * ========================================================================== */
router.use(authenticate, authorize(["admin"]));

/* ---------------- USERS ADMIN ---------------- */

/**
 * GET /api/admin/users
 * ▶️ Liste tous les utilisateurs (avec filtres et pagination)
 * Query: ?page=&pageSize=&role=&q=
 */
router.get(
  "/users",
  query("page").optional().isInt({ min: 1 }),
  query("pageSize").optional().isInt({ min: 1, max: 100 }),
  query("role").optional().isIn(["USER", "PREMIUM", "ADMIN"]),
  handleValidationErrors,
  listUsers
);

/**
 * GET /api/admin/users/:id
 * ▶️ Détail d’un utilisateur
 */
router.get(
  "/users/:id",
  param("id").isString().isLength({ min: 5 }),
  handleValidationErrors,
  getUserById
);

/**
 * PATCH /api/admin/users/:id
 * ▶️ Mettre à jour un utilisateur
 */
router.patch(
  "/users/:id",
  param("id").isString(),
  handleValidationErrors,
  updateUser
);

/**
 * DELETE /api/admin/users/:id
 * ▶️ Supprimer un utilisateur
 */
router.delete(
  "/users/:id",
  param("id").isString(),
  handleValidationErrors,
  deleteUser
);

/**
 * POST /api/admin/users/:id/suspend
 * ▶️ Suspendre un utilisateur
 */
router.post(
  "/users/:id/suspend",
  param("id").isString(),
  handleValidationErrors,
  suspendUser
);

/**
 * GET /api/admin/users/:id/stats
 * ▶️ Récupérer les statistiques d’un utilisateur (projets, paiements, etc.)
 */
router.get(
  "/users/:id/stats",
  param("id").isString(),
  handleValidationErrors,
  getUserStats
);

/* ---------------- PROJECTS ADMIN ---------------- */

/**
 * GET /api/admin/projects
 * ▶️ Liste tous les projets (admin)
 */
router.get("/projects", listProjects);

/**
 * GET /api/admin/projects/:id
 * ▶️ Récupérer un projet spécifique
 */
router.get(
  "/projects/:id",
  param("id").isString(),
  handleValidationErrors,
  getProjectById
);

/**
 * DELETE /api/admin/projects/:id
 * ▶️ Supprimer un projet
 */
router.delete(
  "/projects/:id",
  param("id").isString(),
  handleValidationErrors,
  deleteProject
);

/**
 * POST /api/admin/projects/:id/validate
 * ▶️ Valider un projet (modération)
 */
router.post(
  "/projects/:id/validate",
  param("id").isString(),
  handleValidationErrors,
  validateProject
);

/* ---------------- MARKETPLACE ADMIN ---------------- */

/**
 * GET /api/admin/marketplace/items
 * ▶️ Liste des items en marketplace (filtrés pour modération)
 */
router.get("/marketplace/items", listMarketplaceItems);

/**
 * POST /api/admin/marketplace/items/:id/validate
 * ▶️ Valider ou rejeter un item
 */
router.post(
  "/marketplace/items/:id/validate",
  param("id").isString(),
  handleValidationErrors,
  validateMarketplaceItem
);

/**
 * DELETE /api/admin/marketplace/items/:id
 * ▶️ Supprimer un item marketplace
 */
router.delete(
  "/marketplace/items/:id",
  param("id").isString(),
  handleValidationErrors,
  deleteMarketplaceItem
);

/* ---------------- REPLAYS ADMIN ---------------- */

/**
 * GET /api/admin/replays
 * ▶️ Liste des replays collaboratifs
 */
router.get("/replays", listReplaySessions);

/**
 * GET /api/admin/replays/:id
 * ▶️ Récupérer un replay précis
 */
router.get(
  "/replays/:id",
  param("id").isString(),
  handleValidationErrors,
  getReplayById
);

/**
 * DELETE /api/admin/replays/:id
 * ▶️ Supprimer un replay
 */
router.delete(
  "/replays/:id",
  param("id").isString(),
  handleValidationErrors,
  deleteReplay
);

/* ---------------- LOGS ADMIN ---------------- */

/**
 * GET /api/admin/logs
 * ▶️ Récupérer les logs d’audit
 */
router.get("/logs", getLogs);

/**
 * DELETE /api/admin/logs
 * ▶️ Purger les logs (attention: irréversible)
 */
router.delete("/logs", purgeLogs);

export default router;
