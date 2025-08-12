// src/utils/mailer.ts
import nodemailer, { SendMailOptions } from "nodemailer";

type MailVars = Record<string, string | number | boolean | null | undefined>;
type Attachment = {
  filename?: string;
  content?: Buffer | string;
  path?: string;        // chemin local ou URL
  contentType?: string;
  cid?: string;         // pour images inline
};

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM = process.env.SMTP_FROM || "UINova <no-reply@uinova.app>";
const SMTP_SECURE = process.env.SMTP_SECURE === "1" || SMTP_PORT === 465;
const SMTP_POOL = process.env.SMTP_POOL !== "0"; // pool on par défaut

// DKIM (optionnel)
const DKIM_DOMAIN = process.env.DKIM_DOMAIN; // ex: uinova.app
const DKIM_SELECTOR = process.env.DKIM_SELECTOR; // ex: default
const DKIM_PRIVATE_KEY = process.env.DKIM_PRIVATE_KEY; // contenu PEM

let transporter: nodemailer.Transporter;

// Création (ou Ethereal en dev si pas de conf)
async function createTransporter() {
  if (!SMTP_HOST && process.env.NODE_ENV !== "production") {
    // Mode dev: compte éphémère Ethereal (aperçu web)
    const test = await nodemailer.createTestAccount();
    const t = nodemailer.createTransport({
      host: test.smtp.host,
      port: test.smtp.port,
      secure: test.smtp.secure,
      auth: { user: test.user, pass: test.pass },
    });
    return t;
  }

  const t = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    pool: SMTP_POOL,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    tls: {
      // Permettre de customiser si un proxy TLS est devant (éviter en prod)
      rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED === "0" ? false : true,
    },
    dkim: DKIM_DOMAIN && DKIM_SELECTOR && DKIM_PRIVATE_KEY
      ? {
          domainName: DKIM_DOMAIN,
          keySelector: DKIM_SELECTOR,
          privateKey: DKIM_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }
      : undefined,
  } as any);

  return t;
}

// Initialisation lazy
async function getTransporter() {
  if (!transporter) transporter = await createTransporter();
  return transporter;
}

/**
 * Mini moteur de templates sans dépendance.
 * Remplace {{var}} par values[var], échappe basiquement pour le HTML.
 */
export function renderTemplate(tpl: string, vars: MailVars = {}): string {
  return tpl.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, key) => {
    const v = vars[key.trim()];
    const s = v == null ? "" : String(v);
    return escapeHTML(s);
  });
}
function escapeHTML(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function htmlToText(html: string): string {
  // Fallback text très simple ; pour mieux faire, branche un lib (ex: html-to-text)
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type MailInput = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: Attachment[];
  // Headers utiles (unsubscribe)
  listUnsubscribe?: string; // ex: "<mailto:unsubscribe@uinova.app>, <https://uinova.app/unsubscribe?u=...>"
  category?: string;        // x-category pour filtrage
};

/**
 * Envoi d'un email.
 * Retourne messageId et, en dev/Ethereal, une preview URL.
 */
export async function sendMail(input: MailInput) {
  const t = await getTransporter();

  const headers: Record<string, string> = {};
  if (input.listUnsubscribe) headers["List-Unsubscribe"] = input.listUnsubscribe;
  if (input.category) headers["X-Category"] = input.category;

  const mail: SendMailOptions = {
    from: SMTP_FROM,
    to: input.to,
    cc: input.cc,
    bcc: input.bcc,
    subject: input.subject,
    html: input.html,
    text: input.text || (input.html ? htmlToText(input.html) : undefined),
    replyTo: input.replyTo,
    attachments: input.attachments,
    headers,
  };

  const info = await t.sendMail(mail);

  // Aperçu Ethereal en dev
  const previewUrl =
    (process.env.NODE_ENV !== "production" && (nodemailer as any).getTestMessageUrl)
      ? (nodemailer as any).getTestMessageUrl(info)
      : undefined;

  return { messageId: info.messageId, previewUrl };
}

/**
 * Helper pratique: envoi à partir d'un template HTML + variables.
 * @example
 *  await sendTemplate({
 *    to: "user@mail.com",
 *    subject: "Bienvenue sur UInova",
 *    template: "<h1>Bienvenue, {{name}}</h1><p>Active ton compte: {{url}}</p>",
 *    vars: { name: "Sam", url: "https://..." }
 *  })
 */
export async function sendTemplate(params: {
  to: string | string[];
  subject: string;
  template: string;
  vars?: MailVars;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: Attachment[];
  listUnsubscribe?: string;
  category?: string;
}) {
  const html = renderTemplate(params.template, params.vars);
  return sendMail({
    to: params.to,
    subject: params.subject,
    html,
    cc: params.cc,
    bcc: params.bcc,
    replyTo: params.replyTo,
    attachments: params.attachments,
    listUnsubscribe: params.listUnsubscribe,
    category: params.category,
  });
}
