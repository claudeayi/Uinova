// src/routes/notifications.ts
import { Router } from "express";
import { notify, list, markAsRead, remove } from "../controllers/notificationController";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { body, param } from "express-validator";
import { handleValidationErrors } from "../middlewares/validate";

const router = Router();

// Toutes les routes notifications nécessitent authentification
router.use(requireAuth);

/**
 * Envoyer une notification
 * POST /api/notifications
 */
router.post(
  "/",
  body("message")
    .isString()
    .isLength({ min: 1, max: 500 })
    .withMessage("Le message est obligatoire et doit contenir entre 1 et 500 caractères."),
  handleValidationErrors,
  notify
);

/**
 * Lister les notifications de l'utilisateur connecté
 * GET /api/notifications
 */
router.get("/", list);

/**
 * Marquer une notification comme lue
 * PATCH /api/notifications/:id/read
 */
router.patch(
  "/:id/read",
  param("id").isInt().withMessage("ID de notification invalide"),
  handleValidationErrors,
  markAsRead
);

/**
 * Supprimer une notification
 * DELETE /api/notifications/:id
 */
router.delete(
  "/:id",
  param("id").isInt().withMessage("ID de notification invalide"),
  handleValidationErrors,
  remove
);

export default router;
