// src/services/templateService.ts
import { prisma } from "../utils/prisma";
import { z } from "zod";
import { emitEvent } from "./eventBus";
import { auditLog } from "./auditLogService";
import client from "prom-client";
import { logger } from "../utils/logger";

/* ============================================================================
 * Schemas de validation (Zod)
 * ============================================================================
 */
const TemplateSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(2000),
  price: z.number().min(0),
  json: z.any(),
  tags: z.array(z.string()).optional(),
  authorId: z.string().optional(),
});

/* ============================================================================
 * 📊 Metrics Prometheus
 * ============================================================================
 */
const counterTemplates = new client.Counter({
  name: "uinova_templates_total",
  help: "Nombre total de templates créés/supprimés",
  labelNames: ["action"],
});

const histogramPrice = new client.Histogram({
  name: "uinova_template_price",
  help: "Distribution des prix des templates",
  buckets: [0, 5, 10, 20, 50, 100, 500],
});

/* ============================================================================
 * CRUD Templates
 * ============================================================================
 */
export async function listTemplates(filters?: {
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  tag?: string;
  authorId?: string;
  sortBy?: "newest" | "popular" | "rating";
}) {
  return prisma.marketplaceItem.findMany({
    where: {
      type: "template",
      name: filters?.search ? { contains: filters.search, mode: "insensitive" } : undefined,
      price: { gte: filters?.minPrice, lte: filters?.maxPrice },
      tags: filters?.tag ? { has: filters.tag } : undefined,
      authorId: filters?.authorId,
    },
    orderBy:
      filters?.sortBy === "popular"
        ? { views: "desc" }
        : filters?.sortBy === "rating"
        ? { avgRating: "desc" }
        : { createdAt: "desc" },
  });
}

export async function getTemplate(id: string, userId: string = "system") {
  const tpl = await prisma.marketplaceItem.findUnique({ where: { id } });
  if (!tpl || tpl.type !== "template") return null;

  await prisma.marketplaceItem.update({
    where: { id },
    data: { views: (tpl.views || 0) + 1 },
  });

  emitEvent("template.viewed", { id, userId });
  await auditLog.log(userId, "TEMPLATE_VIEWED", { templateId: id });

  return tpl;
}

export async function createTemplate(data: unknown, userId: string = "system") {
  const parsed = TemplateSchema.safeParse(data);
  if (!parsed.success) throw new Error("INVALID_TEMPLATE_DATA");

  const tpl = await prisma.marketplaceItem.create({
    data: {
      ...parsed.data,
      type: "template",
      content: parsed.data.json,
    },
  });

  counterTemplates.inc({ action: "created" });
  histogramPrice.observe(parsed.data.price);

  emitEvent("template.created", { id: tpl.id, name: tpl.name, price: tpl.price });
  await auditLog.log(userId, "TEMPLATE_CREATED", { id: tpl.id, name: tpl.name });

  return tpl;
}

export async function updateTemplate(
  id: string,
  data: Partial<z.infer<typeof TemplateSchema>>,
  userId: string = "system"
) {
  const tpl = await prisma.marketplaceItem.findUnique({ where: { id } });
  if (!tpl || tpl.type !== "template") throw new Error("TEMPLATE_NOT_FOUND");

  const updated = await prisma.marketplaceItem.update({
    where: { id },
    data: { ...data, content: data.json ?? tpl.content },
  });

  emitEvent("template.updated", { id: updated.id });
  await auditLog.log(userId, "TEMPLATE_UPDATED", { id });

  return updated;
}

export async function deleteTemplate(id: string, userId: string = "system") {
  const tpl = await prisma.marketplaceItem.findUnique({ where: { id } });
  if (!tpl || tpl.type !== "template") throw new Error("TEMPLATE_NOT_FOUND");

  await prisma.marketplaceItem.delete({ where: { id } });

  counterTemplates.inc({ action: "deleted" });

  emitEvent("template.deleted", { id });
  await auditLog.log(userId, "TEMPLATE_DELETED", { id });

  return true;
}

/* ============================================================================
 * Notes et évaluations
 * ============================================================================
 */
export async function rateTemplate(
  templateId: string,
  userId: string,
  rating: number,
  comment?: string
) {
  if (rating < 1 || rating > 5) throw new Error("INVALID_RATING");

  await prisma.templateRating.create({
    data: { templateId, userId, rating, comment },
  });

  const stats = await prisma.templateRating.aggregate({
    where: { templateId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await prisma.marketplaceItem.update({
    where: { id: templateId },
    data: { avgRating: stats._avg.rating || 0, ratingCount: stats._count.rating || 0 },
  });

  emitEvent("template.rated", { templateId, rating, userId });
  await auditLog.log(userId, "TEMPLATE_RATED", { templateId, rating });

  return true;
}

/* ============================================================================
 * Historique des versions (rollback possible)
 * ============================================================================
 */
export async function saveTemplateVersion(templateId: string, json: any, userId: string) {
  const version = await prisma.templateVersion.create({
    data: { templateId, content: json, createdBy: userId },
  });

  emitEvent("template.version.saved", { templateId, versionId: version.id });
  await auditLog.log(userId, "TEMPLATE_VERSION_SAVED", { templateId, versionId: version.id });

  return version;
}

export async function rollbackTemplate(templateId: string, versionId: string, userId: string) {
  const version = await prisma.templateVersion.findUnique({ where: { id: versionId } });
  if (!version) throw new Error("VERSION_NOT_FOUND");

  await prisma.marketplaceItem.update({
    where: { id: templateId },
    data: { content: version.content },
  });

  emitEvent("template.rolledback", { templateId, versionId });
  await auditLog.log(userId, "TEMPLATE_ROLLBACK", { templateId, versionId });

  return true;
}
