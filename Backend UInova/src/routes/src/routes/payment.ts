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

// ✅ Créer un PaymentIntent
router.post(
  "/stripe",
  requireAuth,
  body("amount").isInt({ min: 50 }).withMessage("Montant invalide"),
  handleValidationErrors,
  stripeIntent
);

// ✅ Lister les plans (PricingPage)
router.get("/stripe/prices", listStripePrices);

// ✅ Vérifier statut d’un paiement
router.get(
  "/stripe/status/:paymentIntentId",
  requireAuth,
  param("paymentIntentId").isString().notEmpty(),
  handleValidationErrors,
  getStripePaymentStatus
);

// ✅ Webhook Stripe (⚠️ public, appelé par Stripe)
router.post("/stripe/webhook", stripeWebhook);

/* ============================================================================
 *  PAYPAL
 * ========================================================================== */

// ✅ Créer une commande PayPal
router.post(
  "/paypal/create",
  requireAuth,
  body("amount").isFloat({ min: 1 }).withMessage("Montant invalide"),
  handleValidationErrors,
  paypalCreateOrder
);

// ✅ Capturer une commande PayPal
router.post(
  "/paypal/capture",
  requireAuth,
  body("orderId").isString().notEmpty().withMessage("orderId requis"),
  handleValidationErrors,
  paypalCaptureOrder
);

// ✅ Webhook PayPal (⚠️ public)
router.post("/paypal/webhook", paypalWebhook);

/* ============================================================================
 *  CINETPAY
 * ========================================================================== */

// ✅ Initialiser un paiement CinetPay
router.post(
  "/cinetpay/init",
  requireAuth,
  body("amount").isFloat({ min: 1 }).withMessage("Montant invalide"),
  body("currency").isString().isLength({ min: 3, max: 3 }).withMessage("Devise invalide"),
  handleValidationErrors,
  cinetpayInitPayment
);

// ✅ Vérifier un paiement CinetPay
router.get(
  "/cinetpay/check/:transactionId",
  requireAuth,
  param("transactionId").isString().notEmpty(),
  handleValidationErrors,
  cinetpayCheckPayment
);

/* ============================================================================
 *  MOCK (DEV & TEST)
 * ========================================================================== */

// ✅ Paiement simulé (dev/test)
router.post(
  "/mock",
  requireAuth,
  body("amount").isFloat({ min: 1 }).withMessage("Montant invalide"),
  handleValidationErrors,
  mockPayment
);

export default router;
