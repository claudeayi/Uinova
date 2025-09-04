import { z } from "zod";

export const CreatePurchaseSchema = z.object({
  itemId: z.string(),
});

export const ListPurchasesQuerySchema = z.object({
  status: z.enum(["PENDING", "PAID", "FAILED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
