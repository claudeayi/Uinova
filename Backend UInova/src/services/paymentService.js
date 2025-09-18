// src/services/paymentService.ts
import Stripe from "stripe";
import paypal from "@paypal/checkout-server-sdk";
import axios from "axios";
import { logger } from "../utils/logger";
import { auditLog } from "./auditLogService";
import { emitEvent } from "./eventBus";
import client from "prom-client";

/* ============================================================================
 * Types
 * ============================================================================
 */
export type PaymentProvider = "stripe" | "paypal" | "cinetpay";

export interface PaymentResult {
  provider: PaymentProvider;
  id: string;
  status: "PENDING" | "CREATED" | "SUCCEEDED" | "FAILED";
  clientSecret?: string;
  approvalUrl?: string;
  raw?: any;
}

/* ============================================================================
 * 📊 Metrics Prometheus
 * ============================================================================
 */
const counterPayments = new client.Counter({
  name: "uinova_payments_total",
  help: "Nombre de paiements initiés",
  labelNames: ["provider", "status"],
});

const histogramPaymentLatency = new client.Histogram({
  name: "uinova_payment_latency_ms",
  help: "Latence de création de paiements",
  labelNames: ["provider", "status"],
  buckets: [50, 100, 200, 500, 1000, 2000, 5000, 10000],
});

/* ============================================================================
 * Stripe
 * ============================================================================
 */
const stripe = new Stripe(process.env.STRIPE_SECRET || "", {
  apiVersion: "2022-11-15",
});

export async function createStripePayment(
  amount: number,
  currency = "usd",
  userId: string = "system"
): Promise<PaymentResult> {
  const start = Date.now();
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      automatic_payment_methods: { enabled: true },
    });

    const result: PaymentResult = {
      provider: "stripe",
      id: paymentIntent.id,
      status: (paymentIntent.status?.toUpperCase() as any) || "PENDING",
      clientSecret: paymentIntent.client_secret || undefined,
      raw: paymentIntent,
    };

    logger.info("💳 Stripe payment created", { amount, currency, id: result.id });
    counterPayments.inc({ provider: "stripe", status: "created" });
    histogramPaymentLatency.labels("stripe", "created").observe(Date.now() - start);

    await auditLog.log(userId, "PAYMENT_CREATED", result);
    emitEvent("payment.created", result);

    return result;
  } catch (err: any) {
    logger.error("❌ Stripe payment error", { error: err.message });
    counterPayments.inc({ provider: "stripe", status: "failed" });
    histogramPaymentLatency.labels("stripe", "failed").observe(Date.now() - start);

    await auditLog.log(userId, "PAYMENT_FAILED", { provider: "stripe", error: err.message });
    emitEvent("payment.failed", { provider: "stripe", error: err.message });

    throw new Error("Stripe payment creation failed");
  }
}

/* ============================================================================
 * PayPal
 * ============================================================================
 */
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
  currency = "USD",
  userId: string = "system"
): Promise<PaymentResult> {
  const start = Date.now();
  try {
    const client = getPayPalClient();

    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: "CAPTURE",
      purchase_units: [{ amount: { currency_code: currency, value: amount.toFixed(2) } }],
      application_context: {
        brand_name: "UInova",
        landing_page: "LOGIN",
        user_action: "PAY_NOW",
        return_url: process.env.PAYPAL_RETURN_URL,
        cancel_url: process.env.PAYPAL_CANCEL_URL,
      },
    });

    const response = await client.execute(request);

    const approvalUrl = response.result.links?.find((l: any) => l.rel === "approve")?.href;

    const result: PaymentResult = {
      provider: "paypal",
      id: response.result.id,
      status: "CREATED",
      approvalUrl,
      raw: response.result,
    };

    logger.info("💳 PayPal payment created", result);
    counterPayments.inc({ provider: "paypal", status: "created" });
    histogramPaymentLatency.labels("paypal", "created").observe(Date.now() - start);

    await auditLog.log(userId, "PAYMENT_CREATED", result);
    emitEvent("payment.created", result);

    return result;
  } catch (err: any) {
    logger.error("❌ PayPal payment error", { error: err.message });
    counterPayments.inc({ provider: "paypal", status: "failed" });
    histogramPaymentLatency.labels("paypal", "failed").observe(Date.now() - start);

    await auditLog.log(userId, "PAYMENT_FAILED", { provider: "paypal", error: err.message });
    emitEvent("payment.failed", { provider: "paypal", error: err.message });

    throw new Error("PayPal payment creation failed");
  }
}

/* ============================================================================
 * CinetPay
 * ============================================================================
 */
export async function createCinetPayPayment(
  amount: number,
  currency = "XAF",
  userId: string = "system"
): Promise<PaymentResult> {
  const start = Date.now();
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

    const res = await axios.post("https://api-checkout.cinetpay.com/v2/payment", payload, {
      timeout: 10_000,
    });

    const approvalUrl = res.data?.data?.payment_url || null;

    const result: PaymentResult = {
      provider: "cinetpay",
      id: transactionId,
      status: res.data?.code === "201" ? "CREATED" : "FAILED",
      approvalUrl,
      raw: res.data,
    };

    logger.info("💳 CinetPay payment created", result);
    counterPayments.inc({ provider: "cinetpay", status: result.status.toLowerCase() });
    histogramPaymentLatency.labels("cinetpay", result.status.toLowerCase()).observe(Date.now() - start);

    await auditLog.log(userId, "PAYMENT_CREATED", result);
    emitEvent("payment.created", result);

    return result;
  } catch (err: any) {
    logger.error("❌ CinetPay payment error", { error: err.message });
    counterPayments.inc({ provider: "cinetpay", status: "failed" });
    histogramPaymentLatency.labels("cinetpay", "failed").observe(Date.now() - start);

    await auditLog.log(userId, "PAYMENT_FAILED", { provider: "cinetpay", error: err.message });
    emitEvent("payment.failed", { provider: "cinetpay", error: err.message });

    throw new Error("CinetPay payment creation failed");
  }
}
