import { z } from "zod";

export const CreateFavoriteSchema = z.object({
  projectId: z.string().optional(),
  templateId: z.string().optional(),
}).refine((data) => data.projectId || data.templateId, {
  message: "Un favori doit être lié à un projet ou à un template",
});
