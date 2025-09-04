import { z } from "zod";

export const CreateEmailTemplateSchema = z.object({
  code: z.string().min(3),
  name: z.string(),
  subject: z.string(),
  bodyHtml: z.string(),
  bodyText: z.string().optional(),
  lang: z.string().default("fr"),
});

export const UpdateEmailTemplateSchema = z.object({
  name: z.string().optional(),
  subject: z.string().optional(),
  bodyHtml: z.string().optional(),
  bodyText: z.string().optional(),
  lang: z.string().optional(),
});
