import { z } from "zod";

export const CreatePageSchema = z.object({
  projectId: z.string(),
  name: z.string().min(3),
  schemaJSON: z.record(z.any()),
});

export const UpdatePageSchema = z.object({
  name: z.string().min(3).optional(),
  schemaJSON: z.record(z.any()).optional(),
});
