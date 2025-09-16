// src/controllers/templateController.ts
import { Request, Response } from "express";
import * as templateService from "../services/templateService";
import { prisma } from "../utils/prisma";
import { z } from "zod";
import zlib from "zlib";

/* ============================================================================
 *  Template Controller – CRUD Complet + Audit + Extensions
 * ========================================================================== */

// -------------------- Validation --------------------
const TemplateSchema = z.object({
  name: z.string().min(3, "Nom trop court").max(150),
  description: z.string().min(5, "Description trop courte").max(1000),
  price: z.number().nonnegative().default(0),
  json: z.any(),
  status: z.enum(["draft", "published"]).optional(),
});

// -------------------- Helpers -----------------------
function getCaller(req: Request) {
  return (req as any).user || { id: "anonymous", role: "GUEST" };
}

async function logAudit(userId: string, action: string, details: string, metadata?: any) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        userId,
        details,
        metadata: { ...metadata, ip: req.ip, ua: req.headers["user-agent"] },
      },
    });
  } catch (err) {
    console.error("⚠️ Audit log error:", err);
  }
}

/**
 * ✅ Récupérer tous les templates avec pagination et recherche
 * GET /api/templates?search=...&status=published&page=1&limit=20&sort=name:asc
 */
export async function getAllTemplates(req: Request, res: Response) {
  try {
    const { search = "", status, minPrice, maxPrice, sort = "createdAt:desc", page = "1", limit = "20" } = req.query;

    const templates = await templateService.listTemplates({
      search: String(search),
      page: Number(page),
      limit: Number(limit),
      status: status ? String(status) : undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      sort: String(sort),
    });

    res.json({ success: true, ...templates });
  } catch (err) {
    console.error("❌ getAllTemplates:", err);
    res.status(500).json({ success: false, error: "Erreur récupération templates" });
  }
}

/**
 * ✅ Récupérer un template par ID
 * GET /api/templates/:id
 */
export async function getTemplateById(req: Request, res: Response) {
  try {
    const template = await templateService.getTemplate(req.params.id);
    if (!template) return res.status(404).json({ success: false, error: "Template introuvable" });
    res.json({ success: true, template });
  } catch (err) {
    console.error("❌ getTemplateById:", err);
    res.status(500).json({ success: false, error: "Erreur récupération template" });
  }
}

/**
 * ✅ Publier un nouveau template
 * POST /api/templates
 */
export async function publishTemplate(req: Request, res: Response) {
  try {
    const caller = getCaller(req);
    const parsed = TemplateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.flatten() });
    }

    const template = await templateService.createTemplate({
      ...parsed.data,
      userId: caller.id || null,
    });

    await logAudit(caller.id, "TEMPLATE_PUBLISHED", `Publication template: ${template.id}`, { name: template.name });

    res.status(201).json({ success: true, template });
  } catch (err) {
    console.error("❌ publishTemplate:", err);
    res.status(500).json({ success: false, error: "Erreur publication template" });
  }
}

/**
 * ✅ Mettre à jour un template
 * PUT /api/templates/:id
 */
export async function updateTemplate(req: Request, res: Response) {
  try {
    const caller = getCaller(req);
    const { id } = req.params;
    const parsed = TemplateSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.flatten() });
    }

    const template = await templateService.updateTemplate(id, parsed.data);
    if (!template) return res.status(404).json({ success: false, error: "Template introuvable" });

    await logAudit(caller.id, "TEMPLATE_UPDATED", `Mise à jour template: ${id}`);

    res.json({ success: true, template });
  } catch (err) {
    console.error("❌ updateTemplate:", err);
    res.status(500).json({ success: false, error: "Erreur mise à jour template" });
  }
}

/**
 * ✅ Supprimer un template
 * DELETE /api/templates/:id
 */
export async function deleteTemplate(req: Request, res: Response) {
  try {
    const caller = getCaller(req);
    const { id } = req.params;

    const deleted = await templateService.deleteTemplate(id);
    if (!deleted) return res.status(404).json({ success: false, error: "Template introuvable" });

    await logAudit(caller.id, "TEMPLATE_DELETED", `Suppression template: ${id}`);

    res.json({ success: true, message: "Template supprimé avec succès" });
  } catch (err) {
    console.error("❌ deleteTemplate:", err);
    res.status(500).json({ success: false, error: "Erreur suppression template" });
  }
}

/* ============================================================================
 *  ENDPOINTS SUPPLÉMENTAIRES – enrichis
 * ========================================================================== */

/**
 * ✅ Dupliquer un template
 * POST /api/templates/:id/clone
 */
export async function cloneTemplate(req: Request, res: Response) {
  try {
    const caller = getCaller(req);
    const { id } = req.params;

    const src = await templateService.getTemplate(id);
    if (!src) return res.status(404).json({ success: false, error: "Template introuvable" });

    const copy = await templateService.createTemplate({
      name: `${src.name} (copie)`,
      description: src.description,
      price: src.price,
      json: src.content,
      userId: caller.id || null,
    });

    await logAudit(caller.id, "TEMPLATE_CLONED", `Clonage template ${id}`, { newId: copy.id });

    res.status(201).json({ success: true, template: copy });
  } catch (err) {
    console.error("❌ cloneTemplate:", err);
    res.status(500).json({ success: false, error: "Erreur clonage template" });
  }
}

/**
 * ✅ Basculer statut (publish/unpublish)
 * PATCH /api/templates/:id/toggle
 */
export async function togglePublishTemplate(req: Request, res: Response) {
  try {
    const caller = getCaller(req);
    const { id } = req.params;

    const template = await prisma.marketplaceItem.findUnique({ where: { id } });
    if (!template) return res.status(404).json({ success: false, error: "Template introuvable" });

    const updated = await prisma.marketplaceItem.update({
      where: { id },
      data: { status: template.status === "published" ? "draft" : "published" },
    });

    await logAudit(caller.id, "TEMPLATE_TOGGLED", `Basculer statut template ${id}`, { newStatus: updated.status });

    res.json({ success: true, template: updated });
  } catch (err) {
    console.error("❌ togglePublishTemplate:", err);
    res.status(500).json({ success: false, error: "Erreur bascule statut template" });
  }
}

/**
 * ✅ Stats d’un template
 * GET /api/templates/:id/stats
 */
export async function getTemplateStats(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const template = await prisma.marketplaceItem.findUnique({
      where: { id },
      include: { purchases: true, _count: { select: { purchases: true } } },
    });
    if (!template) return res.status(404).json({ success: false, error: "Template introuvable" });

    res.json({
      success: true,
      stats: {
        totalPurchases: template._count.purchases,
        lastPurchase: template.purchases[0]?.createdAt || null,
        lastUpdated: template.updatedAt,
      },
    });
  } catch (err) {
    console.error("❌ getTemplateStats:", err);
    res.status(500).json({ success: false, error: "Erreur stats template" });
  }
}

/**
 * ✅ Exporter un template en JSON ou ZIP
 * GET /api/templates/:id/export?format=json|zip
 */
export async function exportTemplate(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const format = String(req.query.format || "json");

    const template = await templateService.getTemplate(id);
    if (!template) return res.status(404).json({ success: false, error: "Template introuvable" });

    if (format === "zip") {
      const compressed = zlib.gzipSync(JSON.stringify(template, null, 2));
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename=template-${id}.zip`);
      res.send(compressed);
    } else {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename=template-${id}.json`);
      res.send(JSON.stringify(template, null, 2));
    }
  } catch (err) {
    console.error("❌ exportTemplate:", err);
    res.status(500).json({ success: false, error: "Erreur export template" });
  }
}
