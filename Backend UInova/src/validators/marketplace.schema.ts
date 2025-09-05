import { z } from "zod";

/* ============================================================================
 * MARKETPLACE ITEM
 * ========================================================================== */
export const MarketplaceItemCreateSchema = z.object({
  title: z.string().min(3).max(120, "Titre trop long"),
  description: z.string().max(500).optional(),
  priceCents: z.number().int().nonnegative().default(0),
  currency: z.string().length(3).default("EUR"),
  published: z.boolean().default(true),
});

export const MarketplaceItemUpdateSchema = MarketplaceItemCreateSchema.partial();

export const MarketplaceItemQuerySchema = z.object({
  q: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  sort: z.enum(["createdAt:desc","createdAt:asc","price:asc","price:desc"]).default("createdAt:desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/* ============================================================================
 * PURCHASE
 * ========================================================================== */
export const PurchaseCreateSchema = z.object({
  itemId: z.string().cuid(),
});
