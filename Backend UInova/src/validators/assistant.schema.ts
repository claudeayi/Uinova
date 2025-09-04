import { z } from "zod";

export const AskAssistantSchema = z.object({
  query: z.string().min(3),
  context: z.record(z.any()).optional(),
});
