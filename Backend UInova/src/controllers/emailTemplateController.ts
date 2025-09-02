import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { sendTemplatedEmail } from "../services/emailService";
import { z } from "zod";

/* ============================================================================
 *  SCHEMAS VALIDATION
 * ========================================================================== */
const TemplateCreateSchema = z.object({
  code: z.string().min(3).max(50),
  name: z.string().min(3).max(100),
  subject: z.string().min(3).max(200),
  bodyHtml: z.string().min(3),
  bodyText: z.string().optional(),
});

const TemplateUpdateSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  subject: z.string().min(3).max(200).optional(),
  bodyHtml: z.string().min(3).optional(),
  bodyText: z.string().optional(),
});

const TestEmailSchema = z.object({
  to: z.string().email(),
  variables: z.record(z.any()).optional(),
});

/* ============================================================================
 *  EMAIL TEMPLATE CONTROLLER
 * ========================================================================== */

// ✅ Lister tous les templates
export async function listTemplates(_req: Request, res: Response) {
  const templates = await prisma.emailTemplate.findMany({
    orderBy: { createdAt: "desc" },
  });
  res.json({ success: true, data: templates });
}

// ✅ Détail d’un template
export async function getTemplate(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const tpl = await prisma.emailTemplate.findUnique({ where: { id } });
    if (!tpl) {
      return res.status(404).json({ success: false, message: "Template introuvable" });
    }
    res.json({ success: true, data: tpl });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ✅ Créer un template
export async function createTemplate(req: Request, res: Response) {
  try {
    const data = TemplateCreateSchema.parse(req.body);
    const tpl = await prisma.emailTemplate.create({ data });
    res.status(201).json({ success: true, data: tpl });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

// ✅ Mettre à jour un template
export async function updateTemplate(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const data = TemplateUpdateSchema.parse(req.body);
    const tpl = await prisma.emailTemplate.update({ where: { id }, data });
    res.json({ success: true, data: tpl });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

// ✅ Supprimer un template
export async function deleteTemplate(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await prisma.emailTemplate.delete({ where: { id } });
    res.json({ success: true, message: "Template supprimé" });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

// ✅ Envoyer un test basé sur un template
export async function testTemplate(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { to, variables } = TestEmailSchema.parse(req.body);

    const tpl = await prisma.emailTemplate.findUnique({ where: { id } });
    if (!tpl) {
      return res.status(404).json({ success: false, message: "Template introuvable" });
    }

    const result = await sendTemplatedEmail(tpl.code, to, variables || {});

    // 🔄 Log en base
    await prisma.emailLog.create({
      data: {
        templateId: tpl.id,
        userId: null, // car email test (peut être rempli si admin connecté)
        to,
        subject: tpl.subject,
        body: tpl.bodyHtml,
        status: result.success ? "SUCCESS" : "FAILED",
        error: result.error || null,
      },
    });

    res.json({ success: true, message: "Email test envoyé", result });
  } catch (err: any) {
    console.error("❌ testTemplate error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}
