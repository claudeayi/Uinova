// src/controllers/paymentController.ts
import { Request, Response } from "express";
import Stripe from "stripe";
import { z } from "zod";
import crypto from "node:crypto";
import { prisma } from "../utils/prisma"; // pour audit log & DB persistence

const STRIPE_SECRET = process.env.STRIPE_SECRET || process.env.STRIPE_KEY;
if (!STRIPE_SECRET) {
  throw new Error("❌ Missing STRIPE_SECRET (or STRIPE_KEY) in environment.");
}

export const stripe = new Stripe(STRIPE_SECRET, {
  // apiVersion conseillé à fixer
  // apiVersion: "2024-06-20",
});

/* ============================================================================
 *  SCHEMAS VALIDATION
 * ========================================================================== */
const PaymentIntentSchema = z.object({
  priceId: z.string().trim().optional(),
  quantity: z.coerce.number().int().min(1).max(100).optional(),
  amount: z.coerce.number().int().min(100).max(2_000_000).optional(),
  currency: z.string().default("eur"),
  description: z.string().max(200).optional(),
  orgId: z.string().optional(),
  projectId: z.string().optional(),
  idempotencyKey: z.string().uuid().optional(),
});

function getUser(req: Request) {
  const u = (req as any).user;
  if (!u?.sub && !u?.id) {
    const err: any = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }
  return { id: u.sub || u.id, email: u.email || undefined };
}

async function getOrCreateCustomer(email?: string, userId?: string) {
  if (!email) return undefined;
  const customers = await stripe.customers.list({ email, limit: 1 });
  if (customers.data.length > 0) return customers.data[0];
  return stripe.customers.create({
    email,
    metadata: userId ? { userId } : undefined,
  });
}

/* ============================================================================
 *  CONTROLLERS
 * ========================================================================== */

/**
 * POST /api/payments/intent
 */
export const createPaymentIntent = async (req: Request, res: Response) => {
  try {
    const { id: userId, email } = getUser(req);

    const parsed = PaymentIntentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    }
    const { priceId, quantity = 1, amount, currency, description, orgId, projectId, idempotencyKey } =
      parsed.data;

    const key = idempotencyKey || crypto.randomUUID();
    const customer = await getOrCreateCustomer(email, userId);

    let finalAmount = amount;
    let finalDescription = description;

    if (priceId) {
      const price = await stripe.prices.retrieve(priceId);
      if (!price.active || price.currency !== currency) {
        return res.status(400).json({ error: "Invalid or inactive priceId/currency mismatch" });
      }
      if (!price.unit_amount) {
        return res.status(400).json({ error: "Unsupported price (no unit_amount)" });
      }
      finalAmount = price.unit_amount * quantity;
      finalDescription = description || `UInova purchase (${price.nickname || priceId}) x${quantity}`;
    }

    if (!finalAmount) {
      return res.status(400).json({ error: "Missing amount (provide priceId or amount in cents)" });
    }

    const pi = await stripe.paymentIntents.create(
      {
        amount: finalAmount,
        currency,
        customer: customer?.id,
        description: finalDescription || "UInova purchase",
        automatic_payment_methods: { enabled: true },
        metadata: {
          userId,
          orgId: orgId || "",
          projectId: projectId || "",
          source: "uinova",
          mode: priceId ? "priceId" : "amount",
        },
      },
      { idempotencyKey: key }
    );

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: "PAYMENT_INTENT_CREATED",
        userId,
        details: `Intent ${pi.id} for ${pi.amount} ${pi.currency}`,
      },
    });

    return res.status(201).json({
      clientSecret: pi.client_secret,
      paymentIntentId: pi.id,
      amount: pi.amount,
      currency: pi.currency,
    });
  } catch (e: any) {
    console.error("❌ [Stripe] createPaymentIntent error:", e?.message || e);
    const status = (e as any)?.statusCode || 500;
    return res.status(status).json({ error: "Stripe error", details: e?.message || "unknown_error" });
  }
};

/**
 * GET /api/payments/:id/status
 * → Récupère le statut d’un PaymentIntent
 */
export const getPaymentStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pi = await stripe.paymentIntents.retrieve(id);
    res.json({
      success: true,
      id: pi.id,
      status: pi.status,
      amount: pi.amount,
      currency: pi.currency,
    });
  } catch (e: any) {
    console.error("❌ getPaymentStatus error:", e?.message);
    res.status(500).json({ success: false, error: e?.message || "Erreur récupération paiement" });
  }
};

/**
 * GET /api/payments/prices
 * → Liste des plans (PricingPage)
 */
export const listPrices = async (_req: Request, res: Response) => {
  try {
    const prices = await stripe.prices.list({ active: true, expand: ["data.product"] });
    res.json({ success: true, data: prices.data });
  } catch (e: any) {
    console.error("❌ listPrices error:", e?.message);
    res.status(500).json({ success: false, error: "Erreur récupération tarifs" });
  }
};

/**
 * POST /api/payments/webhook
 * → Stripe envoie les événements (paiement réussi/échoué/remboursé)
 */
export const stripeWebhook = async (req: Request, res: Response) => {
  try {
    const sig = req.headers["stripe-signature"];
    if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
      return res.status(400).send("Missing Stripe signature or webhook secret");
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      console.error("❌ Stripe webhook signature error:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        await prisma.payment.create({
          data: {
            id: pi.id,
            amount: pi.amount,
            currency: pi.currency,
            status: pi.status,
            userId: pi.metadata.userId || null,
            projectId: pi.metadata.projectId || null,
            provider: "stripe",
          },
        });
        console.log("✅ Payment succeeded:", pi.id);
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        console.warn("⚠️ Payment failed:", pi.id);
        break;
      }
      default:
        console.log(`ℹ️ Stripe event: ${event.type}`);
    }

    res.json({ received: true });
  } catch (e: any) {
    console.error("❌ stripeWebhook error:", e?.message);
    res.status(500).json({ success: false, error: "Erreur webhook Stripe" });
  }
};
