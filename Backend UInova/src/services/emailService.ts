// src/services/emailService.ts
import { prisma } from "../utils/prisma";
import { sendEmail } from "../utils/mailer";
import { auditLog } from "./auditLogService";
import { emitEvent } from "./eventBus";
import { logger } from "../utils/logger";
import client from "prom-client";
import { z } from "zod";

/* ============================================================================
 * 📊 Metrics Prometheus
 * ============================================================================
 */
const counterEmails = new client.Counter({
  name: "uinova_emails_total",
  help: "Nombre total d’emails envoyés",
  labelNames: ["status", "template"],
});

const histogramLatency = new client.Histogram({
  name: "uinova_email_latency_ms",
  help: "Latence d’envoi d’emails",
  buckets: [50, 100, 200, 500, 1000, 2000, 5000],
});

/* ============================================================================
 * Validation Zod
 * ============================================================================
 */
const emailSchema = z.string().email();
const variablesSchema = z.record(z.any());

/* ============================================================================
 * Service d’envoi d’emails basés sur des templates dynamiques
 * ============================================================================
 */
export async function sendTemplatedEmail(
  code: string,
  to: string,
  variables: Record<string, any> = {},
  options: { userId?: string; from?: string; lang?: string } = {}
) {
  const start = Date.now();

  try {
    // 1. Validation inputs
    emailSchema.parse(to);
    variablesSchema.parse(variables);

    // 2. Récupérer le template (multi-langue)
    let template = await prisma.emailTemplate.findFirst({
      where: { code, lang: options.lang || "fr" },
    });

    if (!template) {
      template = await prisma.emailTemplate.findUnique({ where: { code } });
    }

    if (!template) {
      throw new Error(`Template email ${code} introuvable`);
    }

    // 3. Rendu dynamique {{variables}}
    const render = (str: string) =>
      str.replace(/{{(.*?)}}/g, (_, key) => {
        const val = variables[key.trim()];
        return val !== undefined && val !== null ? String(val) : "";
      });

    const subject = render(template.subject);
    const bodyHtml = render(template.bodyHtml);
    const bodyText = template.bodyText ? render(template.bodyText) : undefined;

    // 4. Expéditeur
    const from = options.from || process.env.SMTP_FROM || "no-reply@uinova.com";

    // 5. Envoi
    const result = await sendEmail(to, subject, "custom", {
      from,
      html: bodyHtml,
      text: bodyText,
    });

    // 6. Log succès
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

    await auditLog.log(options.userId || "system", "EMAIL_SENT", {
      code,
      to,
      subject,
      templateId: template.id,
    });

    emitEvent("email.sent", {
      userId: options.userId,
      template: code,
      to,
      messageId: result?.messageId,
    });

    counterEmails.inc({ status: "success", template: code });
    histogramLatency.observe(Date.now() - start);

    logger.info(`📧 Email envoyé avec succès [${code}] → ${to}`);

    return { success: true, messageId: result?.messageId || null };
  } catch (err: any) {
    // 7. Log échec
    await prisma.emailLog.create({
      data: {
        templateId: undefined,
        userId: options.userId || null,
        to,
        subject: code,
        body: JSON.stringify(variables),
        status: "FAILED",
        error: err?.message || "Unknown error",
        provider: "smtp",
      },
    });

    await auditLog.log(options.userId || "system", "EMAIL_FAILED", {
      code,
      to,
      error: err?.message,
    });

    emitEvent("email.failed", {
      userId: options.userId,
      template: code,
      to,
      error: err?.message,
    });

    counterEmails.inc({ status: "failed", template: code });
    histogramLatency.observe(Date.now() - start);

    logger.error(`❌ Email envoi échoué [${code}] → ${to}`, err);

    // ⚡ Ici on pourra brancher une file de retry (BullMQ)
    throw err;
  }
}
