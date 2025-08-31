// src/routes/notifications.ts
import { Router } from "express";
import {
  notify,
  list,
  markRead,
  markAllRead,
  remove,
} from "../controllers/notificationController";
import { authenticate } from "../middlewares/security";
import { body, param } from "express-validator";
import { handleValidationErrors } from "../middlewares/validate";

const router = Router();

/* ============================================================================
 *  NOTIFICATION ROUTES – nécessite authentification
 * ========================================================================== */
router.use(authenticate);

/**
 * POST /api/notifications
 * Envoyer une notification
 * - USER : pour lui-même
 * - ADMIN : peut cibler un autre user via userId
 */
router.post(
  "/",
  body("message")
    .isString()
    .isLength({ min: 1, max: 1000 })
    .withMessage("Le message est obligatoire et doit contenir entre 1 et 1000 caractères."),
  body("title")
    .isString()
    .isLength({ min: 1, max: 120 })
    .withMessage("Le titre est obligatoire et doit contenir entre 1 et 120 caractères."),
  handleValidationErrors,
  notify
);

/**
 * GET /api/notifications
 * Lister les notifications de l'utilisateur (ou d’un autre si admin)
 */
router.get("/", list);

/**
 * PATCH /api/notifications/:id/read
 * Marquer une notification comme lue
 */
router.patch(
  "/:id/read",
  param("id").isString().withMessage("ID de notification invalide"),
  handleValidationErrors,
  markRead
);

/**
 * POST /api/notifications/read-all
 * Marquer toutes les notifications comme lues
 * - USER : marque les siennes
 * - ADMIN : peut cibler un autre via body.userId
 */
router.post("/read-all", markAllRead);

/**
 * DELETE /api/notifications/:id
 * Supprimer une notification
 * - USER : peut supprimer les siennes
 * - ADMIN : peut supprimer celles d’autrui
 */
router.delete(
  "/:id",
  param("id").isString().withMessage("ID de notification invalide"),
  handleValidationErrors,
  remove
);

export default router;
