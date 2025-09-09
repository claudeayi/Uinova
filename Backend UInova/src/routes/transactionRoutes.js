// src/routes/transactions.ts
import { Router } from "express";
import { body, param, query } from "express-validator";
import { prisma } from "../utils/prisma";
import { authenticate, authorize } from "../middlewares/security";
import { handleValidationErrors } from "../middlewares/validate";

const router = Router();

/* ============================================================================
 *  TRANSACTIONS ROUTES
 * ========================================================================== */
router.use(authenticate);

/**
 * POST /api/transactions
 * ✅ Créer une transaction après un paiement réussi
 */
router.post(
  "/",
  body("provider")
    .isIn(["STRIPE", "PAYPAL", "CINETPAY", "MOCK"])
    .withMessage("Fournisseur invalide"),
  body("amount").isInt({ min: 1 }).withMessage("Montant invalide"),
  body("currency").isString().isLength({ min: 3, max: 3 }),
  body("status").isIn(["PENDING", "SUCCESS", "FAILED", "REFUNDED"]),
  body("reference").isString().isLength({ min: 5 }),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { provider, amount, currency, status, reference } = req.body;

      const tx = await prisma.transaction.create({
        data: {
          userId: req.user!.id,
          provider,
          amount,
          currency,
          status,
          reference,
        },
      });

      res.status(201).json({ success: true, message: "Transaction créée", data: tx });
    } catch (err: any) {
      console.error("❌ Transaction create error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * GET /api/transactions/user/:userId
 * ✅ Lister transactions d’un utilisateur
 * - USER ne peut voir que ses propres transactions
 * - ADMIN peut voir celles des autres
 */
router.get(
  "/user/:userId",
  param("userId").isString().withMessage("userId invalide"),
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("pageSize").optional().isInt({ min: 1, max: 100 }).toInt(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const page = Number(req.query.page) || 1;
      const pageSize = Number(req.query.pageSize) || 20;

      if (req.user!.role !== "ADMIN" && req.user!.id !== userId) {
        return res.status(403).json({ success: false, error: "Accès interdit" });
      }

      const [total, txs] = await Promise.all([
        prisma.transaction.count({ where: { userId } }),
        prisma.transaction.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ]);

      res.json({
        success: true,
        data: txs,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      });
    } catch (err: any) {
      console.error("❌ Transaction list error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * GET /api/transactions/:id
 * ✅ Récupérer le détail d’une transaction
 */
router.get(
  "/:id",
  param("id").isString().withMessage("id invalide"),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const tx = await prisma.transaction.findUnique({ where: { id } });

      if (!tx) return res.status(404).json({ success: false, error: "Transaction introuvable" });

      if (req.user!.role !== "ADMIN" && tx.userId !== req.user!.id) {
        return res.status(403).json({ success: false, error: "Accès interdit" });
      }

      res.json({ success: true, data: tx });
    } catch (err: any) {
      console.error("❌ Transaction get error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * DELETE /api/transactions/:id
 * ✅ Supprimer une transaction (ADMIN only)
 */
router.delete(
  "/:id",
  authorize(["ADMIN"]),
  param("id").isString().withMessage("id invalide"),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      await prisma.transaction.delete({ where: { id } });
      res.json({ success: true, message: `Transaction ${id} supprimée` });
    } catch (err: any) {
      console.error("❌ Transaction delete error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * GET /api/transactions/search/ref/:reference
 * ✅ Rechercher une transaction par référence
 */
router.get(
  "/search/ref/:reference",
  param("reference").isString().withMessage("Référence invalide"),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { reference } = req.params;
      const tx = await prisma.transaction.findUnique({ where: { reference } });

      if (!tx) return res.status(404).json({ success: false, error: "Transaction introuvable" });

      if (req.user!.role !== "ADMIN" && tx.userId !== req.user!.id) {
        return res.status(403).json({ success: false, error: "Accès interdit" });
      }

      res.json({ success: true, data: tx });
    } catch (err: any) {
      console.error("❌ Transaction search error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

export default router;
