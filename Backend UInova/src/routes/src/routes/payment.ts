// src/routes/payments.ts
import { Router } from "express";
import {
  stripeIntent,
  paypalCreateOrder,
  paypalCaptureOrder,
  cinetpayInitPayment,
  cinetpayCheckPayment,
  mockPayment
} from "../controllers/paymentController";
import { requireAuth } from "../middlewares/auth";
import { body } from "express-validator";
import { handleValidationErrors } from "../middlewares/validate";

const router = Router();

// Toutes les routes de paiement nécessitent une authentification
router.use(requireAuth);

/**
 * Stripe Payment Intent
 * POST /api/payments/stripe
 */
router.post(
  "/stripe",
  body("amount").isInt({ min: 50 }).withMessage("Montant invalide"),
  handleValidationErrors,
  stripeIntent
);

/**
 * PayPal - Créer une commande
 * POST /api/payments/paypal/create
 */
router.post(
  "/paypal/create",
  body("amount").isFloat({ min: 1 }).withMessage("Montant invalide"),
  handleValidationErrors,
  paypalCreateOrder
);

/**
 * PayPal - Capturer une commande
 * POST /api/payments/paypal/capture
 */
router.post(
  "/paypal/capture",
  body("orderId").isString().notEmpty().withMessage("orderId requis"),
  handleValidationErrors,
  paypalCaptureOrder
);

/**
 * CinetPay - Initialiser un paiement
 * POST /api/payments/cinetpay/init
 */
router.post(
  "/cinetpay/init",
  body("amount").isFloat({ min: 1 }).withMessage("Montant invalide"),
  body("currency").isString().isLength({ min: 3, max: 3 }).withMessage("Devise invalide"),
  handleValidationErrors,
  cinetpayInitPayment
);

/**
 * CinetPay - Vérifier un paiement
 * GET /api/payments/cinetpay/check/:transactionId
 */
router.get("/cinetpay/check/:transactionId", cinetpayCheckPayment);

/**
 * Mock Payment (pour tests et dev)
 * POST /api/payments/mock
 */
router.post(
  "/mock",
  body("amount").isFloat({ min: 1 }).withMessage("Montant invalide"),
  handleValidationErrors,
  mockPayment
);

export default router;
