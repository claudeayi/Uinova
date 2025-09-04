import { z } from "zod";

export const AwardBadgeSchema = z.object({
  userId: z.string(),
  badgeCode: z.string(),
  meta: z.record(z.any()).optional(),
});
