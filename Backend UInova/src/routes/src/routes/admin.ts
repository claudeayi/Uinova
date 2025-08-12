// src/routes/admin.ts
import { Router } from "express";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { listUsers, deleteUser } from "../controllers/adminController";
import { handleValidationErrors } from "../middlewares/validate";
import { checkSchema } from "express-validator";

const router = Router();

// Valide :id (numérique ou cuid/uuid-like)
const validateUserIdParam = checkSchema(
  {
    id: {
      in: ["params"],
      custom: {
        options: (v) => {
          if (typeof v === "number") return Number.isFinite(v);
          if (typeof v === "string") {
            if (/^\d+$/.test(v)) return true;              // numérique
            if (/^c[a-z0-9]{24,}$/i.test(v)) return true;  // cuid-like
            if (/^[0-9a-f-]{10,}$/i.test(v)) return true;  // uuid-like
          }
          return false;
        },
      },
      errorMessage: "Identifiant utilisateur invalide",
    },
  },
  ["params"]
);

/**
 * Admin endpoints
 * GET /api/admin/users      -> liste paginée/safe (cf. adminController)
 * DELETE /api/admin/users/:id -> supprime un utilisateur
 */
router.use(requireAuth, requireAdmin);

router.get("/users", listUsers);

router.delete(
  "/users/:id",
  validateUserIdParam,
  handleValidationErrors,
  deleteUser
);

export default router;
