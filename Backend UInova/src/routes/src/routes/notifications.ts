// src/routes/notifications.ts
import { Router } from "express";
import {
  notify,
  list,
  markRead,
  markAllRead,
  remove,
} from "../controllers/notificationController";
import { authenticate, authorize } from "../middlewares/security";
import { body, param } from "express-validator";
import { handleValidationErrors } from "../middlewares/validate";
import { notificationService } from "../services/notificationService";

const router = Router();

/* ============================================================================
 *  NOTIFICATION ROUTES – nécessite authentification
 * ========================================================================== */
router.use(authenticate);

/**
 * POST /api/notifications
 * Créer une notification (DB + multi-canal si activé)
 * - USER : ne peut notifier que lui-même
 * - ADMIN : peut cibler n’importe quel utilisateur
 */
router.post(
  "/",
  body("title")
    .isString()
    .isLength({ min: 1, max: 120 })
    .withMessage("Le titre est obligatoire (1–120 caractères)."),
  body("message")
    .isString()
    .isLength({ min: 1, max: 1000 })
    .withMessage("Le message est obligatoire (1–1000 caractères)."),
  body("type")
    .optional()
    .isIn(["INFO", "ALERT", "BILLING", "SYSTEM"])
    .withMessage("Type de notification invalide."),
  body("userId")
    .optional()
    .isString()
    .withMessage("userId invalide"),
  handleValidationErrors,
  notify
);

/**
 * GET /api/notifications
 * Lister les notifications
 * - USER : liste uniquement ses notifications
 * - ADMIN : peut filtrer avec ?userId
 */
router.get("/", list);

/**
 * PATCH /api/notifications/:id/read
 * Marquer une notification comme lue
 */
router.patch(
  "/:id/read",
  param("id")
    .isString()
    .isLength({ min: 8 })
    .withMessage("ID de notification invalide."),
  handleValidationErrors,
  markRead
);

/**
 * POST /api/notifications/read-all
 * Marquer toutes les notifications comme lues
 * - USER : uniquement les siennes
 * - ADMIN : peut cibler via body.userId
 */
router.post(
  "/read-all",
  body("userId")
    .optional()
    .isString()
    .withMessage("userId invalide."),
  handleValidationErrors,
  markAllRead
);

/**
 * DELETE /api/notifications/:id
 * Supprimer une notification
 * - USER : peut supprimer uniquement les siennes
 * - ADMIN : peut supprimer celles d’autrui
 */
router.delete(
  "/:id",
  param("id")
    .isString()
    .isLength({ min: 8 })
    .withMessage("ID de notification invalide."),
  handleValidationErrors,
  remove
);

/* ============================================================================
 *  TEST & DIAGNOSTIC – Notifications multi-canal
 * ========================================================================== */

/**
 * POST /api/notifications/test
 * Créer et envoyer une notification de test (DB + socket + email si configuré)
 */
router.post(
  "/test",
  body("title").isString().notEmpty().withMessage("Titre obligatoire."),
  body("message").isString().notEmpty().withMessage("Message obligatoire."),
  body("type")
    .optional()
    .isIn(["INFO", "ALERT", "BILLING", "SYSTEM"])
    .withMessage("Type de notification invalide."),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { title, message, type } = req.body;
      const userId = req.user!.id;

      const notif = await notificationService.create(
        userId,
        type || "INFO",
        title,
        message,
        { test: true }
      );

      return res.json({ success: true, notif });
    } catch (err: any) {
      console.error("❌ Notification test error:", err);
      return res
        .status(500)
        .json({ error: "NOTIFICATION_ERROR", message: "Erreur création notification" });
    }
  }
);

export default router;
