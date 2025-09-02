import { prisma } from "../utils/prisma";
import { sendEmail } from "../utils/mailer";

/**
 * Envoie un e-mail basé sur un template stocké en DB.
 * @param code - Code unique du template en base
 * @param to - Destinataire
 * @param variables - Variables dynamiques {{var}}
 * @param options - { userId?, from? }
 */
export async function sendTemplatedEmail(
  code: string,
  to: string,
  variables: Record<string, any> = {},
  options: { userId?: string; from?: string } = {}
) {
  // Récupérer template par code (⚡ multi-langue possible plus tard)
  const template = await prisma.emailTemplate.findUnique({ where: { code } });
  if (!template) throw new Error(`Template email ${code} introuvable`);

  // Render {{variables}}
  const render = (str: string) =>
    str.replace(/{{(.*?)}}/g, (_, key) => {
      const val = variables[key.trim()];
      return val !== undefined && val !== null ? String(val) : "";
    });

  const subject = render(template.subject);
  const bodyHtml = render(template.bodyHtml);
  const bodyText = template.bodyText ? render(template.bodyText) : undefined;

  const from = options.from || process.env.SMTP_FROM || "no-reply@uinova.com";

  try {
    const result = await sendEmail(to, subject, "custom", {
      from,
      html: bodyHtml,
      text: bodyText,
    });

    // Sauvegarde du log
    await prisma.emailLog.create({
      data: {
        templateId: template.id,
        userId: options.userId || null,
        to,
        subject,
        body: bodyHtml,
        status: "SUCCESS",
      },
    });

    return { success: true, messageId: result?.messageId || null };
  } catch (err: any) {
    await prisma.emailLog.create({
      data: {
        templateId: template.id,
        userId: options.userId || null,
        to,
        subject,
        body: bodyHtml,
        status: "FAILED",
        error: err?.message || "Unknown error",
      },
    });

    console.error(`❌ Email envoi échoué [${code}] → ${to}`, err);
    throw err;
  }
}
