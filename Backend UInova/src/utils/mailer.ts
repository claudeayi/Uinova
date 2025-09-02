import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.mailtrap.io",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || "user",
    pass: process.env.SMTP_PASS || "pass",
  },
});

export async function sendEmail(
  to: string,
  subject: string,
  template: string,
  data: Record<string, any>
) {
  // ⚡ Templates simples (tu pourras remplacer par Handlebars/ejs)
  const html = renderTemplate(template, data);

  return transporter.sendMail({
    from: process.env.MAIL_FROM || '"UInova" <noreply@uinova.dev>',
    to,
    subject,
    html,
  });
}

function renderTemplate(template: string, data: Record<string, any>) {
  switch (template) {
    case "welcome":
      return `<h1>Bienvenue sur UInova 🚀</h1><p>Merci ${data.name} pour ton inscription.</p>`;
    case "payment_success":
      return `<h1>Paiement confirmé ✅</h1><p>Montant: ${data.amount} ${data.currency}</p>`;
    case "reset_password":
      return `<h1>Réinitialisation de mot de passe</h1><p>Clique ici: <a href="${data.link}">${data.link}</a></p>`;
    default:
      return `<p>${data.message || "Email sans contenu."}</p>`;
  }
}
