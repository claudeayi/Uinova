// src/routes/payments.ts
import { Router } from "express";
import {
  stripeIntent,
  stripeWebhook,
  listStripePrices,
  getStripePaymentStatus,
  paypalCreateOrder,
  paypalCaptureOrder,
  paypalWebhook,
  cinetpayInitPayment,
  cinetpayCheckPayment,
  mockPayment,
} from "../controllers/paymentController";
import { requireAuth } from "../middlewares/auth";
import { body, param } from "express-validator";
import { handleValidationErrors } from "../middlewares/validate";

const router = Router();

/* ============================================================================
 *  STRIPE
 * ========================================================================== */

/**
 * POST /api/payments/stripe
 * Crée un PaymentIntent Stripe
 */
router.post(
  "/stripe",
  requireAuth,
  body("amount")
    .isInt({ min: 50, max: 2_000_000 })
    .withMessage("Montant invalide (min 50 centimes, max 20 000€)."),
  body("currency")
    .optional()
    .isString()
    .isLength({ min: 3, max: 3 })
    .withMessage("Devise invalide (ISO 4217)."),
  handleValidationErrors,
  stripeIntent
);

/**
 * GET /api/payments/stripe/prices
 * Liste les produits / plans Stripe (Pricing Page)
 */
router.get("/stripe/prices", listStripePrices);

/**
 * GET /api/payments/stripe/status/:paymentIntentId
 * Vérifie le statut d’un PaymentIntent
 */
router.get(
  "/stripe/status/:paymentIntentId",
  requireAuth,
  param("paymentIntentId")
    .isString()
    .isLength({ min: 8 })
    .withMessage("paymentIntentId invalide."),
  handleValidationErrors,
  getStripePaymentStatus
);

/**
 * POST /api/payments/stripe/webhook
 * Webhook Stripe (⚠️ public)
 */
router.post("/stripe/webhook", stripeWebhook);

/* ============================================================================
 *  PAYPAL
 * ========================================================================== */

/**
 * POST /api/payments/paypal/create
 * Crée une commande PayPal
 */
router.post(
  "/paypal/create",
  requireAuth,
  body("amount")
    .isFloat({ min: 1 })
    .withMessage("Montant invalide (≥ 1)."),
  body("currency")
    .optional()
    .isString()
    .isLength({ min: 3, max: 3 })
    .withMessage("Devise invalide."),
  handleValidationErrors,
  paypalCreateOrder
);

/**
 * POST /api/payments/paypal/capture
 * Capture une commande PayPal
 */
router.post(
  "/paypal/capture",
  requireAuth,
  body("orderId")
    .isString()
    .isLength({ min: 6 })
    .withMessage("orderId requis."),
  handleValidationErrors,
  paypalCaptureOrder
);

/**
 * POST /api/payments/paypal/webhook
 * Webhook PayPal (⚠️ public)
 */
router.post("/paypal/webhook", paypalWebhook);

/* ============================================================================
 *  CINETPAY
 * ========================================================================== */

/**
 * POST /api/payments/cinetpay/init
 * Initialise un paiement via CinetPay
 */
router.post(
  "/cinetpay/init",
  requireAuth,
  body("amount")
    .isFloat({ min: 1 })
    .withMessage("Montant invalide (≥ 1)."),
  body("currency")
    .isString()
    .isLength({ min: 3, max: 3 })
    .withMessage("Devise invalide."),
  body("transactionId")
    .optional()
    .isString()
    .withMessage("transactionId invalide."),
  handleValidationErrors,
  cinetpayInitPayment
);

/**
 * GET /api/payments/cinetpay/check/:transactionId
 * Vérifie un paiement CinetPay
 */
router.get(
  "/cinetpay/check/:transactionId",
  requireAuth,
  param("transactionId")
    .isString()
    .isLength({ min: 6 })
    .withMessage("transactionId invalide."),
  handleValidationErrors,
  cinetpayCheckPayment
);

/* ============================================================================
 *  MOCK (DEV & TEST)
 * ========================================================================== */

/**
 * POST /api/payments/mock
 * Paiement simulé (dev/test uniquement)
 */
router.post(
  "/mock",
  requireAuth,
  body("amount")
    .isFloat({ min: 1 })
    .withMessage("Montant invalide."),
  handleValidationErrors,
  mockPayment
);

export default router;
