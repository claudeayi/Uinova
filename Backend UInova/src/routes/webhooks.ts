import { Router } from "express";
import { authenticate } from "../middlewares/security";
import { registerWebhook, listWebhooks, removeWebhook } from "../services/eventBus";
import { body, param } from "express-validator";
import { handleValidationErrors } from "../middlewares/validate";

const router = Router();

/* ============================================================================
 * WEBHOOK ROUTES – nécessite authentification
 * ============================================================================
 */
router.use(authenticate);

/**
 * POST /api/webhooks/register
 * ➝ Enregistrer un webhook externe (event + url)
 */
router.post(
  "/register",
  body("url").isURL().withMessage("URL de webhook invalide"),
  body("event")
    .isString()
    .isLength({ min: 3, max: 50 })
    .withMessage("Événement requis"),
  handleValidationErrors,
  async (req, res) => {
    try {
      const user = (req as any).user;
      const { url, event } = req.body;

      const webhook = await registerWebhook(user.id, url, event);
      res.status(201).json({ success: true, data: webhook });
    } catch (err: any) {
      console.error("❌ registerWebhook error:", err);
      res.status(500).json({ success: false, message: "Erreur enregistrement webhook" });
    }
  }
);

/**
 * GET /api/webhooks
 * ➝ Lister mes webhooks
 */
router.get("/", async (req, res) => {
  try {
    const user = (req as any).user;
    const hooks = await listWebhooks(user.id);
    res.json({ success: true, data: hooks });
  } catch (err: any) {
    console.error("❌ listWebhooks error:", err);
    res.status(500).json({ success: false, message: "Erreur récupération webhooks" });
  }
});

/**
 * DELETE /api/webhooks/:id
 * ➝ Supprimer un webhook
 */
router.delete(
  "/:id",
  param("id").isString().withMessage("ID invalide"),
  handleValidationErrors,
  async (req, res) => {
    try {
      const user = (req as any).user;
      const { id } = req.params;

      const removed = await removeWebhook(user.id, id);
      if (!removed) {
        return res.status(404).json({ success: false, message: "Webhook introuvable" });
      }

      res.json({ success: true, message: "Webhook supprimé" });
    } catch (err: any) {
      console.error("❌ removeWebhook error:", err);
      res.status(500).json({ success: false, message: "Erreur suppression webhook" });
    }
  }
);

export default router;
