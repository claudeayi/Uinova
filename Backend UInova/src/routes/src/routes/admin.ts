// src/routes/admin.ts
import { Router } from "express";
import { authenticate } from "../middlewares/auth";
import { authorize } from "../middlewares/authorize";
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
import { prisma } from "../utils/prisma";

/* ============================================================================
 * VALIDATORS
 * ========================================================================== */
const validateIdParam = checkSchema(
  {
    id: {
      in: ["params"],
      custom: {
        options: (v) => {
          if (typeof v !== "string") return false;
          return (
            /^\d+$/.test(v) || // numérique
            /^c[a-z0-9]{24,}$/i.test(v) || // cuid
            /^[0-9a-f-]{10,}$/i.test(v) // uuid
          );
        },
      },
      errorMessage: "Identifiant invalide",
    },
  },
  ["params"]
);

/* ============================================================================
 * ADMIN ROUTES – toutes nécessitent authentification + rôle ADMIN
 * ========================================================================== */
const router = Router();

// Auth obligatoire + rôle ADMIN
router.use(authenticate, authorize(["ADMIN"]));

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
router.post(
  "/marketplace/items/:id/validate",
  validateIdParam,
  handleValidationErrors,
  validateMarketplaceItem
);
router.delete(
  "/marketplace/items/:id",
  validateIdParam,
  handleValidationErrors,
  deleteMarketplaceItem
);

/* ---------------- REPLAYS ADMIN ---------------- */
router.get("/replays", listReplaySessions);
router.get("/replays/:id", validateIdParam, handleValidationErrors, getReplayById);
router.delete("/replays/:id", validateIdParam, handleValidationErrors, deleteReplay);

/* ---------------- LOGS ADMIN ---------------- */
router.get("/logs", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  return getLogs(req, res, next);
});

/* ---------------- AUDIT LOG ADMIN ---------------- */
router.get("/audit", async (_req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: {
        user: { select: { id: true, email: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.setHeader("Cache-Control", "no-store");
    res.json({ success: true, data: logs });
  } catch (err) {
    console.error("❌ /admin/audit error:", err);
    res.status(500).json({ success: false, message: "Erreur récupération audit log" });
  }
});

/* ---------------- STATS ADMIN ---------------- */
router.get("/stats", async (_req, res) => {
  try {
    const [users, projects, items, replays] = await Promise.all([
      prisma.user.count(),
      prisma.project.count(),
      prisma.marketplaceItem.count(),
      prisma.replaySession.count(),
    ]);
    res.json({
      success: true,
      data: { users, projects, marketplaceItems: items, replays },
    });
  } catch (err) {
    console.error("❌ /admin/stats error:", err);
    res.status(500).json({ success: false, message: "Erreur récupération stats" });
  }
});

export default router;
