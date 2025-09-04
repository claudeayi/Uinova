import { z } from "zod";

export const CreateMarketplaceItemSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  priceCents: z.number().min(0),
  currency: z.string().default("EUR"),
});

export const UpdateMarketplaceItemSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  priceCents: z.number().min(0).optional(),
  currency: z.string().optional(),
});
