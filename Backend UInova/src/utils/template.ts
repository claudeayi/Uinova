/**
 * Génère le contenu HTML pour l'email de bienvenue UInova
 * @param userName - Nom ou prénom de l'utilisateur
 * @returns HTML de l'email
 */
export function renderWelcomeMail(userName: string): string {
  return `
    <div style="font-family: Arial, sans-serif; background-color: #f5f6fa; padding: 20px;">
      <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #4f46e5; color: #ffffff; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Bienvenue sur UInova 🎉</h1>
        </div>
        <div style="padding: 20px; color: #333333;">
          <p style="font-size: 16px;">Bonjour <strong>${userName}</strong>,</p>
          <p style="font-size: 15px; line-height: 1.6;">
            Merci d’avoir rejoint <strong>UInova</strong>, la plateforme <em>nocode</em> la plus avancée pour créer
            des applications et sites web en toute simplicité.
          </p>
          <p style="font-size: 15px; line-height: 1.6;">
            Vous êtes maintenant prêt à explorer nos outils de création intuitifs, à collaborer en temps réel et à publier vos projets en quelques clics.
          </p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="https://uinova.app" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 16px;">
              🚀 Commencer maintenant
            </a>
          </div>
          <p style="font-size: 14px; color: #666666;">
            L’équipe UInova vous souhaite beaucoup de succès dans vos créations.
          </p>
        </div>
        <div style="background-color: #f0f0f0; padding: 15px; text-align: center; font-size: 12px; color: #888888;">
          © ${new Date().getFullYear()} UInova - Tous droits réservés
        </div>
      </div>
    </div>
  `;
}
