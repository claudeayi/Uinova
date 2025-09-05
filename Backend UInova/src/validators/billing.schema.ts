import { z } from "zod";

/* ============================================================================
 * BILLING
 * ========================================================================== */
export const BillingUsageQuerySchema = z.object({
  userId: z.string().optional(),
  projectId: z.string().optional(),
  type: z.enum(["api_call","ai_tokens","export_job","storage"]).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const SubscriptionCreateSchema = z.object({
  plan: z.enum(["FREE","PRO","BUSINESS","ENTERPRISE"]),
  orgId: z.string().optional(),
});

export const SubscriptionUpdateSchema = z.object({
  status: z.enum(["TRIAL","ACTIVE","PAST_DUE","CANCELED"]).optional(),
});

export const PaymentIntentSchema = z.object({
  provider: z.enum(["STRIPE","PAYPAL","CINETPAY","MOCK"]),
  amountCents: z.number().int().positive(),
  currency: z.string().length(3).default("EUR"),
  projectId: z.string().optional(),
  subscriptionId: z.string().optional(),
});
