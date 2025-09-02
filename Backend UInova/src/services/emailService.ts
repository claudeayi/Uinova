import { prisma } from "../utils/prisma";
import { sendEmail } from "../utils/mailer";

/**
 * Envoie un e-mail basé sur un template stocké en DB.
 */
export async function sendTemplatedEmail(
  code: string,
  to: string,
  variables: Record<string, any> = {}
) {
  const template = await prisma.emailTemplate.findUnique({ where: { code } });
  if (!template) throw new Error(`Template email ${code} introuvable`);

  // Remplace {{variable}} dans subject et bodyHtml
  const render = (str: string) =>
    str.replace(/{{(.*?)}}/g, (_, key) => variables[key.trim()] || "");

  const subject = render(template.subject);
  const bodyHtml = render(template.bodyHtml);
  const bodyText = template.bodyText ? render(template.bodyText) : undefined;

  try {
    await sendEmail(to, subject, "custom", { html: bodyHtml, text: bodyText });

    await prisma.emailLog.create({
      data: {
        templateId: template.id,
        to,
        subject,
        body: bodyHtml,
        status: "SUCCESS",
      },
    });
  } catch (err: any) {
    await prisma.emailLog.create({
      data: {
        templateId: template.id,
        to,
        subject,
        body: bodyHtml,
        status: "FAILED",
        error: err.message,
      },
    });
    throw err;
  }
}
