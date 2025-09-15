// src/services/templateService.ts
import { prisma } from "../utils/prisma";
import { z } from "zod";
import { emitEvent } from "./eventBus";

/* ============================================================================
 * Schemas de validation (Zod)
 * ========================================================================== */
const TemplateSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(2000),
  price: z.number().min(0),
  json: z.any(),
  tags: z.array(z.string()).optional(),
  authorId: z.string().optional(),
});

/* ============================================================================
 * CRUD Templates
 * ========================================================================== */
export async function listTemplates(filters?: {
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  tag?: string;
}) {
  return prisma.marketplaceItem.findMany({
    where: {
      type: "template",
      name: filters?.search ? { contains: filters.search, mode: "insensitive" } : undefined,
      price: {
        gte: filters?.minPrice,
        lte: filters?.maxPrice,
      },
      tags: filters?.tag ? { has: filters.tag } : undefined,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getTemplate(id: string) {
  const tpl = await prisma.marketplaceItem.findUnique({ where: { id } });
  if (!tpl || tpl.type !== "template") return null;

  // 🔹 Incrémenter compteur de vues
  await prisma.marketplaceItem.update({
    where: { id },
    data: { views: (tpl.views || 0) + 1 },
  });

  return tpl;
}

export async function createTemplate(data: unknown) {
  const parsed = TemplateSchema.safeParse(data);
  if (!parsed.success) throw new Error("INVALID_TEMPLATE_DATA");

  const tpl = await prisma.marketplaceItem.create({
    data: {
      ...parsed.data,
      type: "template",
      content: parsed.data.json,
    },
  });

  emitEvent("template.created", { id: tpl.id, name: tpl.name, price: tpl.price });
  return tpl;
}

export async function updateTemplate(id: string, data: Partial<z.infer<typeof TemplateSchema>>) {
  const tpl = await prisma.marketplaceItem.findUnique({ where: { id } });
  if (!tpl || tpl.type !== "template") throw new Error("TEMPLATE_NOT_FOUND");

  const updated = await prisma.marketplaceItem.update({
    where: { id },
    data: { ...data, content: data.json ?? tpl.content },
  });

  emitEvent("template.updated", { id: updated.id });
  return updated;
}

export async function deleteTemplate(id: string) {
  const tpl = await prisma.marketplaceItem.findUnique({ where: { id } });
  if (!tpl || tpl.type !== "template") throw new Error("TEMPLATE_NOT_FOUND");

  await prisma.marketplaceItem.delete({ where: { id } });

  emitEvent("template.deleted", { id });
  return true;
}

/* ============================================================================
 * Notes et évaluations
 * ========================================================================== */
export async function rateTemplate(templateId: string, userId: string, rating: number, comment?: string) {
  if (rating < 1 || rating > 5) throw new Error("INVALID_RATING");

  await prisma.templateRating.create({
    data: { templateId, userId, rating, comment },
  });

  // 🔹 Mettre à jour la moyenne
  const stats = await prisma.templateRating.aggregate({
    where: { templateId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await prisma.marketplaceItem.update({
    where: { id: templateId },
    data: {
      avgRating: stats._avg.rating || 0,
      ratingCount: stats._count.rating || 0,
    },
  });

  emitEvent("template.rated", { templateId, rating });
  return true;
}

/* ============================================================================
 * Historique des versions (rollback possible)
 * ========================================================================== */
export async function saveTemplateVersion(templateId: string, json: any, userId: string) {
  const version = await prisma.templateVersion.create({
    data: {
      templateId,
      content: json,
      createdBy: userId,
    },
  });

  emitEvent("template.version.saved", { templateId, versionId: version.id });
  return version;
}

export async function rollbackTemplate(templateId: string, versionId: string) {
  const version = await prisma.templateVersion.findUnique({ where: { id: versionId } });
  if (!version) throw new Error("VERSION_NOT_FOUND");

  await prisma.marketplaceItem.update({
    where: { id: templateId },
    data: { content: version.content },
  });

  emitEvent("template.rolledback", { templateId, versionId });
  return true;
}
