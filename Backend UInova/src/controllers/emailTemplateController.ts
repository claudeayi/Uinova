import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { sendTemplatedEmail } from "../services/emailService";

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

// ✅ Créer un template
export async function createTemplate(req: Request, res: Response) {
  try {
    const { code, name, subject, bodyHtml, bodyText } = req.body;
    const tpl = await prisma.emailTemplate.create({
      data: { code, name, subject, bodyHtml, bodyText },
    });
    res.status(201).json({ success: true, data: tpl });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

// ✅ Mettre à jour un template
export async function updateTemplate(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, subject, bodyHtml, bodyText } = req.body;
    const tpl = await prisma.emailTemplate.update({
      where: { id },
      data: { name, subject, bodyHtml, bodyText },
    });
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
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

// ✅ Envoyer un test basé sur un template
export async function testTemplate(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { to, variables } = req.body;
    const tpl = await prisma.emailTemplate.findUnique({ where: { id } });
    if (!tpl) return res.status(404).json({ success: false, message: "Template introuvable" });

    await sendTemplatedEmail(tpl.code, to, variables || {});
    res.json({ success: true, message: "Email test envoyé" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
