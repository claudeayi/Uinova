import { z } from "zod";

export const CreateNotificationSchema = z.object({
  userId: z.string(),
  type: z.enum(["info", "warning", "error"]).default("info"),
  title: z.string(),
  body: z.string().optional(),
  actionUrl: z.string().url().optional(),
  meta: z.record(z.any()).optional(),
});
