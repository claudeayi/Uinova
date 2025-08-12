// src/services/paymentService.ts
import Stripe from "stripe";

// =========================
// Config & Types
// =========================
export type Currency = "eur" | "usd" | "xaf" | "xof";
export type PaymentProvider = "stripe" | "paypal" | "cinetpay" | "mock";

export type PaymentInitInput = {
  userId: string | number;
  amount: number;          // en centimes pour Stripe / en unité pour PayPal/CinetPay (on convertit)
  currency?: Currency;     // default env / "eur"
  description?: string;
  orgId?: string;
  projectId?: string;
  idempotencyKey?: string; // UUID v4 recommandé
  // Stripe
  paymentMethodType?: "card" | "mobilepay" | "link";
  customerId?: string;     // Stripe customer existant (optionnel)
  // PayPal
  locale?: string;         // fr_FR, en_US...
  // CinetPay
  returnUrl?: string;
  notifyUrl?: string;
};

export type PaymentInitResult =
  | { provider: "stripe"; clientSecret: string; paymentIntentId: string }
  | { provider: "paypal"; orderId: string; approveUrl: string }
  | { provider: "cinetpay"; transactionId: string; paymentUrl: string }
  | { provider: "mock"; clientSecret: string; status: "requires_action" | "succeeded" };

function assertEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in environment`);
  return v;
}

function toCents(amount: number): number {
  if (!Number.isFinite(amount)) throw new Error("Invalid amount");
  // arrondit proprement (ex: 10.99 -> 1099)
  return Math.round(amount);
}

// =========================
// Stripe
// =========================
const STRIPE_KEY = process.env.STRIPE_KEY;
const stripe = STRIPE_KEY
  ? new Stripe(STRIPE_KEY, { apiVersion: "2023-10-16" })
  : null;

export async function createStripeIntent(input: PaymentInitInput): Promise<PaymentInitResult> {
  if (!stripe) throw new Error("Stripe not configured");
  const currency = (input.currency || (process.env.DEFAULT_CURRENCY as Currency) || "eur").toLowerCase() as Currency;

  // amount attendu en centimes pour Stripe
  const amount = toCents(input.amount);
  if (amount < 50) throw new Error("Montant minimum 50 centimes");

  const metadata: Record<string, string> = {
    userId: String(input.userId),
    ...(input.orgId ? { orgId: String(input.orgId) } : {}),
    ...(input.projectId ? { projectId: String(input.projectId) } : {}),
  };

  const params: Stripe.PaymentIntentCreateParams = {
    amount,
    currency,
    description: input.description,
    customer: input.customerId,
    automatic_payment_methods: { enabled: true },
    metadata,
  };

  const intent = await stripe.paymentIntents.create(params, {
    idempotencyKey: input.idempotencyKey, // safe retry côté front
  });

  return {
    provider: "stripe",
    clientSecret: intent.client_secret!,
    paymentIntentId: intent.id,
  };
}

// Optionnel: vérifier un PaymentIntent (ex: webhooks ou polling)
export async function retrieveStripeIntent(paymentIntentId: string) {
  if (!stripe) throw new Error("Stripe not configured");
  return stripe.paymentIntents.retrieve(paymentIntentId);
}

// =========================
/** PayPal (Orders) */
// =========================
// SDK officiel conseillé : @paypal/checkout-server-sdk
// Ici wrapper minimal, compatible avec le controller proposé.
let paypalClient: any = null;
if (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) {
  try {
    // lazy import pour ne pas imposer la dépendance si non utilisée
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const checkoutSdk = require("@paypal/checkout-server-sdk");

    const env =
      (process.env.PAYPAL_MODE || "sandbox") === "live"
        ? new checkoutSdk.core.LiveEnvironment(
            assertEnv("PAYPAL_CLIENT_ID"),
            assertEnv("PAYPAL_CLIENT_SECRET")
          )
        : new checkoutSdk.core.SandboxEnvironment(
            assertEnv("PAYPAL_CLIENT_ID"),
            assertEnv("PAYPAL_CLIENT_SECRET")
          );

    paypalClient = new checkoutSdk.core.PayPalHttpClient(env);
  } catch (e) {
    console.warn("[payments] PayPal SDK not installed, skipping.");
  }
}

export async function paypalCreateOrder(input: PaymentInitInput): Promise<PaymentInitResult> {
  if (!paypalClient) throw new Error("PayPal not configured");
  const currency = (input.currency || (process.env.DEFAULT_CURRENCY as Currency) || "EUR").toUpperCase();

  // PayPal attend le montant en unité (pas en centimes)
  const value = (toCents(input.amount) / 100).toFixed(2);

  const request = new (require("@paypal/checkout-server-sdk")).orders.OrdersCreateRequest();
  request.headers["PayPal-Request-Id"] = input.idempotencyKey || undefined;
  request.requestBody({
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: {
          currency_code: currency,
          value,
        },
        description: input.description,
        custom_id: String(input.userId),
      },
    ],
    application_context: {
      user_action: "PAY_NOW",
      locale: input.locale || "fr_FR",
      brand_name: process.env.APP_NAME || "UINova",
      return_url: input.returnUrl || process.env.PAYPAL_RETURN_URL,
      cancel_url: input.returnUrl || process.env.PAYPAL_CANCEL_URL,
    },
  });

  const order = await paypalClient.execute(request);
  const approveUrl =
    order?.result?.links?.find((l: any) => l.rel === "approve")?.href || "";

  return { provider: "paypal", orderId: order.result.id, approveUrl };
}

export async function paypalCaptureOrder(orderId: string) {
  if (!paypalClient) throw new Error("PayPal not configured");
  const req = new (require("@paypal/checkout-server-sdk")).orders.OrdersCaptureRequest(orderId);
  req.requestBody({});
  const res = await paypalClient.execute(req);
  return res.result; // renvoie l'objet capture (statut, id, etc.)
}

// =========================
/** CinetPay */
// =========================
// NB: l’intégration exacte dépend de leur SDK/API. Ci-dessous un wrapper générique basé sur fetch.
export async function cinetpayInitPayment(input: PaymentInitInput): Promise<PaymentInitResult> {
  const apiKey = process.env.CINETPAY_API_KEY;
  const siteId = process.env.CINETPAY_SITE_ID;
  const base = process.env.CINETPAY_BASE_URL || "https://api-checkout.cinetpay.com/v2";
  if (!apiKey || !siteId) throw new Error("CinetPay not configured");

  const currency = (input.currency || "XAF").toUpperCase();
  const txId = input.idempotencyKey || `uinova_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const body = {
    apikey: apiKey,
    site_id: siteId,
    transaction_id: txId,
    amount: (toCents(input.amount) / 100).toFixed(2),     // CinetPay attend l’unité (ex: 1000 XAF)
    currency,
    description: input.description || "UINova payment",
    notify_url: input.notifyUrl || process.env.CINETPAY_NOTIFY_URL,
    return_url: input.returnUrl || process.env.CINETPAY_RETURN_URL,
    channels: "ALL",
    lang: "fr",
    customer_id: String(input.userId),
  };

  const resp = await fetch(`${base}/payment`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`CinetPay init failed: ${text}`);
  }
  const json = await resp.json();
  // selon API: json.data?.payment_url / json.data?.transaction_id
  const paymentUrl = json?.data?.payment_url || json?.data?.payment_url || "";
  const transactionId = json?.data?.transaction_id || txId;

  return { provider: "cinetpay", transactionId, paymentUrl };
}

export async function cinetpayCheckPayment(transactionId: string) {
  const apiKey = process.env.CINETPAY_API_KEY;
  const siteId = process.env.CINETPAY_SITE_ID;
  const base = process.env.CINETPAY_BASE_URL || "https://api-checkout.cinetpay.com/v2";
  if (!apiKey || !siteId) throw new Error("CinetPay not configured");

  const resp = await fetch(`${base}/payment/check`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ apikey: apiKey, site_id: siteId, transaction_id: transactionId }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`CinetPay check failed: ${text}`);
  }
  return resp.json(); // renvoie le statut du paiement
}

// =========================
// Mock (dev/test)
// =========================
export async function mockPayment(input: PaymentInitInput): Promise<PaymentInitResult> {
  const cs = `mock_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return { provider: "mock", clientSecret: cs, status: "requires_action" };
}
