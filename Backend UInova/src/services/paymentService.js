// src/services/paymentService.ts
import Stripe from "stripe";
import paypal from "@paypal/checkout-server-sdk";
import axios from "axios";
import { logger } from "../utils/logger"; // ✅ ton logger global

/* ============================================================================
 * Types
 * ========================================================================== */
export type PaymentProvider = "stripe" | "paypal" | "cinetpay";

export interface PaymentResult {
  provider: PaymentProvider;
  id: string;
  status: "PENDING" | "CREATED" | "SUCCEEDED" | "FAILED";
  clientSecret?: string;   // Stripe
  approvalUrl?: string;    // PayPal / CinetPay redirect
  raw?: any;               // Données brutes
}

/* ============================================================================
 * Stripe
 * ========================================================================== */
const stripe = new Stripe(process.env.STRIPE_SECRET || "", {
  apiVersion: "2022-11-15",
});

export async function createStripePayment(
  amount: number,
  currency = "usd"
): Promise<PaymentResult> {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      automatic_payment_methods: { enabled: true },
    });

    logger.info("💳 Stripe payment created", { amount, currency, id: paymentIntent.id });

    return {
      provider: "stripe",
      id: paymentIntent.id,
      status: (paymentIntent.status?.toUpperCase() as any) || "PENDING",
      clientSecret: paymentIntent.client_secret || undefined,
      raw: paymentIntent,
    };
  } catch (err: any) {
    logger.error("❌ Stripe payment error", { error: err.message });
    throw new Error("Stripe payment creation failed");
  }
}

/* ============================================================================
 * PayPal
 * ========================================================================== */
function getPayPalClient() {
  const env =
    process.env.PAYPAL_MODE === "sandbox"
      ? new paypal.core.SandboxEnvironment(
          process.env.PAYPAL_CLIENT_ID!,
          process.env.PAYPAL_SECRET!
        )
      : new paypal.core.LiveEnvironment(
          process.env.PAYPAL_CLIENT_ID!,
          process.env.PAYPAL_SECRET!
        );
  return new paypal.core.PayPalHttpClient(env);
}

export async function createPayPalPayment(
  amount: number,
  currency = "USD"
): Promise<PaymentResult> {
  try {
    const client = getPayPalClient();

    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: { currency_code: currency, value: amount.toFixed(2) },
        },
      ],
      application_context: {
        brand_name: "UInova",
        landing_page: "LOGIN",
        user_action: "PAY_NOW",
        return_url: process.env.PAYPAL_RETURN_URL,
        cancel_url: process.env.PAYPAL_CANCEL_URL,
      },
    });

    const response = await client.execute(request);

    const approvalUrl = response.result.links?.find(
      (l: any) => l.rel === "approve"
    )?.href;

    logger.info("💳 PayPal payment created", {
      id: response.result.id,
      amount,
      currency,
      approvalUrl,
    });

    return {
      provider: "paypal",
      id: response.result.id,
      status: "CREATED",
      approvalUrl,
      raw: response.result,
    };
  } catch (err: any) {
    logger.error("❌ PayPal payment error", { error: err.message });
    throw new Error("PayPal payment creation failed");
  }
}

/* ============================================================================
 * CinetPay
 * ========================================================================== */
export async function createCinetPayPayment(
  amount: number,
  currency = "XAF"
): Promise<PaymentResult> {
  try {
    const transactionId = `uinova_${Date.now()}`;
    const payload = {
      apikey: process.env.CINETPAY_API_KEY,
      site_id: process.env.CINETPAY_SITE_ID,
      transaction_id: transactionId,
      amount,
      currency,
      description: "UInova Payment",
      notify_url: process.env.CINETPAY_NOTIFY_URL,
      return_url: process.env.CINETPAY_RETURN_URL,
    };

    const res = await axios.post(
      "https://api-checkout.cinetpay.com/v2/payment",
      payload,
      { timeout: 10_000 }
    );

    const approvalUrl = res.data?.data?.payment_url || null;

    logger.info("💳 CinetPay payment created", {
      id: transactionId,
      amount,
      currency,
      approvalUrl,
    });

    return {
      provider: "cinetpay",
      id: transactionId,
      status: res.data?.code === "201" ? "CREATED" : "FAILED",
      approvalUrl,
      raw: res.data,
    };
  } catch (err: any) {
    logger.error("❌ CinetPay payment error", { error: err.message });
    throw new Error("CinetPay payment creation failed");
  }
}
