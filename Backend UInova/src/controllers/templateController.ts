// src/controllers/templateController.ts
import { Request, Response } from "express";
import * as templateService from "../services/templateService";
import { prisma } from "../utils/prisma";

/* ============================================================================
 *  Template Controller – CRUD Complet + Audit
 * ========================================================================== */

/**
 * ✅ Récupérer tous les templates avec pagination et recherche
 * GET /api/templates?search=...&page=1&limit=20
 */
export async function getAllTemplates(req: Request, res: Response) {
  try {
    const { search = "", page = "1", limit = "20" } = req.query;

    const templates = await templateService.listTemplates({
      search: String(search),
      page: Number(page),
      limit: Number(limit),
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
    const caller = (req as any).user || { id: "anonymous" };
    const { name, description, price, json } = req.body;

    if (!name || !description || !json) {
      return res.status(400).json({ success: false, error: "Champs requis manquants" });
    }

    const template = await templateService.createTemplate({
      name,
      description,
      price: Number(price) || 0,
      json,
      userId: caller.id || null,
    });

    await prisma.auditLog.create({
      data: {
        action: "TEMPLATE_PUBLISHED",
        userId: caller.id || null,
        details: `Publication template: ${template.id} (${template.name})`,
      },
    });

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
    const caller = (req as any).user || { id: "anonymous" };
    const { id } = req.params;
    const { name, description, price, json, status } = req.body;

    const template = await templateService.updateTemplate(id, {
      name,
      description,
      price,
      json,
      status,
    });

    if (!template) return res.status(404).json({ success: false, error: "Template introuvable" });

    await prisma.auditLog.create({
      data: {
        action: "TEMPLATE_UPDATED",
        userId: caller.id || null,
        details: `Mise à jour template: ${id}`,
      },
    });

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
    const caller = (req as any).user || { id: "anonymous" };
    const { id } = req.params;

    const deleted = await templateService.deleteTemplate(id);
    if (!deleted) return res.status(404).json({ success: false, error: "Template introuvable" });

    await prisma.auditLog.create({
      data: {
        action: "TEMPLATE_DELETED",
        userId: caller.id || null,
        details: `Suppression template: ${id}`,
      },
    });

    res.json({ success: true, message: "Template supprimé avec succès" });
  } catch (err) {
    console.error("❌ deleteTemplate:", err);
    res.status(500).json({ success: false, error: "Erreur suppression template" });
  }
}
