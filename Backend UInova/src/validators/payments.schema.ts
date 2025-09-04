import { z } from "zod";

export const CreatePaymentSchema = z.object({
  provider: z.enum(["STRIPE", "PAYPAL", "CINETPAY", "MOCK"]),
  amountCents: z.number().positive(),
  currency: z.string().default("EUR"),
  projectId: z.string().optional(),
  subscriptionId: z.string().optional(),
});
