// src/controllers/paymentController.ts
import { Request, Response } from "express";
import Stripe from "stripe";
import { z } from "zod";
import crypto from "node:crypto";

const STRIPE_SECRET = process.env.STRIPE_SECRET || process.env.STRIPE_KEY;
if (!STRIPE_SECRET) {
  throw new Error("Missing STRIPE_SECRET (or STRIPE_KEY) in environment.");
}

export const stripe = new Stripe(STRIPE_SECRET, {
  // apiVersion facultatif mais conseillé à fixer dans .env/stripe config
  // apiVersion: "2024-06-20",
});

// ----------- Validation
const PaymentIntentSchema = z.object({
  // MODE 1 (recommandé) : priceId + quantity -> le serveur calcule amount
  priceId: z.string().trim().optional(),
  quantity: z.coerce.number().int().min(1).max(100).optional(),

  // MODE 2 (moins sûr) : amount (en centimes). À n'utiliser que pour debug/achats personnalisés sécurisés serveur.
  amount: z.coerce.number().int().min(100).max(2_000_000).optional(), // 1€ .. 20 000€

  currency: z.string().default("eur"),
  description: z.string().max(200).optional(),

  // pour tracer côté Stripe
  orgId: z.string().optional(),
  projectId: z.string().optional(),

  // pour idempotence côté client (rejouer sans double débit)
  idempotencyKey: z.string().uuid().optional(),
});

// ----------- Helpers
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
  // Idéalement, tu stockes customerId sur le User pour éviter la recherche
  const customers = await stripe.customers.list({ email, limit: 1 });
  if (customers.data.length > 0) return customers.data[0];

  return stripe.customers.create({
    email,
    metadata: userId ? { userId } : undefined,
  });
}

/**
 * POST /api/payments/intent
 * Body:
 *  - Recommandé: { priceId: "price_XXX", quantity?: number, currency?: "eur" }
 *  - Ou fallback: { amount: 1299, currency?: "eur" }
 * Response: { clientSecret, paymentIntentId }
 */
export const createPaymentIntent = async (req: Request, res: Response) => {
  try {
    const { id: userId, email } = getUser(req);

    const parsed = PaymentIntentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    }
    const {
      priceId,
      quantity = 1,
      amount,
      currency,
      description,
      orgId,
      projectId,
      idempotencyKey,
    } = parsed.data;

    // Idempotence (évite double débit si re-submit)
    const key = idempotencyKey || crypto.randomUUID();

    // Préparer customer
    const customer = await getOrCreateCustomer(email, userId);

    // MODE RECOMMANDÉ : on calcule amount depuis priceId
    let finalAmount = amount;
    let finalDescription = description;

    if (priceId) {
      // Récupère le prix chez Stripe
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

    // Crée le PaymentIntent
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
        // Optionnel: pour des reçus automatiques
        // receipt_email: customer?.email,
      },
      { idempotencyKey: key },
    );

    return res.status(201).json({
      clientSecret: pi.client_secret,
      paymentIntentId: pi.id,
      amount: pi.amount,
      currency: pi.currency,
    });
  } catch (e: any) {
    console.error("[Stripe] createPaymentIntent error:", e?.message || e);
    const status = (e as any)?.statusCode || 500;
    return res.status(status).json({ error: "Stripe error", details: e?.message || "unknown_error" });
  }
};
