import { z } from "zod";

export const SaveExportSchema = z.object({
  type: z.enum(["HTML", "REACT", "FLUTTER", "PWA", "ZIP"]),
  content: z.string().optional(),
  strategy: z.enum(["direct", "enqueue"]).default("direct"),
  meta: z.record(z.any()).optional(),
});
