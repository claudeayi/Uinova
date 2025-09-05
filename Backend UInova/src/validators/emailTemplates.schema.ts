import { z } from "zod";

/* ============================================================================
 * EMAIL TEMPLATE
 * ========================================================================== */
export const EmailTemplateCreateSchema = z.object({
  code: z.string().min(3).max(50),
  name: z.string().min(3).max(120),
  subject: z.string().min(3).max(200),
  bodyHtml: z.string(),
  bodyText: z.string().optional(),
  lang: z.string().length(2).default("fr"),
});

export const EmailTemplateUpdateSchema = EmailTemplateCreateSchema.partial();

export const EmailTemplateQuerySchema = z.object({
  lang: z.string().length(2).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
