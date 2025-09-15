import { prisma } from "../utils/prisma";
import { sendEmail } from "../utils/mailer";

/**
 * Service d’envoi d’emails basés sur des templates dynamiques
 * - Support multi-langues
 * - Fallback si template introuvable
 * - Logging complet (audit, status, error)
 */
export async function sendTemplatedEmail(
  code: string,
  to: string,
  variables: Record<string, any> = {},
  options: { userId?: string; from?: string; lang?: string } = {}
) {
  // 1. Récupérer le template (⚡ multi-langue si défini)
  let template = await prisma.emailTemplate.findFirst({
    where: { code, lang: options.lang || "fr" },
  });

  if (!template) {
    template = await prisma.emailTemplate.findUnique({ where: { code } });
  }

  if (!template) {
    console.error(`⚠️ Aucun template trouvé pour code=${code}, lang=${options.lang}`);
    throw new Error(`Template email ${code} introuvable`);
  }

  // 2. Rendu dynamique {{variables}}
  const render = (str: string) =>
    str.replace(/{{(.*?)}}/g, (_, key) => {
      const val = variables[key.trim()];
      return val !== undefined && val !== null ? String(val) : "";
    });

  const subject = render(template.subject);
  const bodyHtml = render(template.bodyHtml);
  const bodyText = template.bodyText ? render(template.bodyText) : undefined;

  // 3. Expéditeur (priorité : param > env > fallback)
  const from = options.from || process.env.SMTP_FROM || "no-reply@uinova.com";

  try {
    // 4. Envoi
    const result = await sendEmail(to, subject, "custom", {
      from,
      html: bodyHtml,
      text: bodyText,
    });

    // 5. Log succès
    await prisma.emailLog.create({
      data: {
        templateId: template.id,
        userId: options.userId || null,
        to,
        subject,
        body: bodyHtml,
        status: "SUCCESS",
        provider: "smtp",
        messageId: result?.messageId || null,
      },
    });

    console.log(`📧 Email envoyé avec succès [${code}] → ${to}`);

    return { success: true, messageId: result?.messageId || null };
  } catch (err: any) {
    // 6. Log échec
    await prisma.emailLog.create({
      data: {
        templateId: template.id,
        userId: options.userId || null,
        to,
        subject,
        body: bodyHtml,
        status: "FAILED",
        error: err?.message || "Unknown error",
        provider: "smtp",
      },
    });

    console.error(`❌ Email envoi échoué [${code}] → ${to}`, err);

    // ⚡ Relance possible via file d’attente (future intégration)
    throw err;
  }
}
