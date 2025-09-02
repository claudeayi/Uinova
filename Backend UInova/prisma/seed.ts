import { PrismaClient, UserRole, ProjectStatus, SubscriptionPlan, SubscriptionStatus, PaymentProvider, PaymentStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = "john.doe@uinova.dev";

  // ✅ User seed
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash: "$2a$10$W2Hk3o5dJx3s4vW1Q0JROuu7oYoG0nHnF9r8n9aFZlI0k1aC6wqGi", // hash = "Secret123!"
      name: "John Doe",
      role: UserRole.PREMIUM,
      avatarUrl: "https://i.pravatar.cc/150?u=john",
    },
  });

  // 🔄 Clean anciens projets de ce user
  await prisma.project.deleteMany({ where: { ownerId: user.id } });

  // ✅ Projects
  const [alpha, beta, gamma] = await prisma.$transaction([
    prisma.project.create({
      data: {
        ownerId: user.id,
        name: "Projet Alpha",
        description: "Application web moderne avec React et Node.js",
        status: ProjectStatus.EN_COURS,
        pages: {
          create: [
            { name: "Home", schemaJSON: { type: "page", elements: [] } },
            { name: "Dashboard", schemaJSON: { type: "page", elements: [] } },
          ],
        },
      },
    }),
    prisma.project.create({
      data: {
        ownerId: user.id,
        name: "Projet Bêta",
        description: "Interface utilisateur mobile avec Flutter",
        status: ProjectStatus.TERMINE,
      },
    }),
    prisma.project.create({
      data: {
        ownerId: user.id,
        name: "Projet Gamma",
        description: "Système de gestion de contenu CMS",
        status: ProjectStatus.PLANIFIE,
      },
    }),
  ]);

  // ✅ Subscription
  const subscription = await prisma.subscription.create({
    data: {
      userId: user.id,
      plan: SubscriptionPlan.PRO,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 jours
    },
  });

  // ✅ Payment lié à l’abonnement
  await prisma.payment.create({
    data: {
      provider: PaymentProvider.STRIPE,
      providerRef: "pi_1234567890",
      amountCents: 4900,
      currency: "EUR",
      status: PaymentStatus.SUCCEEDED,
      userId: user.id,
      subscriptionId: subscription.id,
    },
  });

  // ✅ Notification
  await prisma.notification.createMany({
    data: [
      { userId: user.id, type: "info", title: "Bienvenue 🎉", body: "Merci d’avoir rejoint UInova !" },
      { userId: user.id, type: "warning", title: "Quota", body: "Vous avez atteint 80% de votre quota d’assets." },
    ],
  });

  // ✅ Badge
  const badge = await prisma.badge.upsert({
    where: { code: "EARLY_ADOPTER" },
    update: {},
    create: { code: "EARLY_ADOPTER", label: "Early Adopter 🚀", icon: "🌟" },
  });

  await prisma.userBadge.upsert({
    where: { userId_badgeId: { userId: user.id, badgeId: badge.id } },
    update: {},
    create: { userId: user.id, badgeId: badge.id },
  });

  // ✅ Marketplace Item
  const template = await prisma.marketplaceItem.create({
    data: {
      title: "Template Portfolio",
      description: "Portfolio moderne pour freelances",
      priceCents: 1900,
      ownerId: user.id,
    },
  });

  await prisma.purchase.create({
    data: { itemId: template.id, buyerId: user.id },
  });

  // ✅ Deployment
  await prisma.deployment.create({
    data: {
      projectId: alpha.id,
      status: "SUCCESS",
      targetUrl: "https://alpha.uinova.dev",
      logs: "Déploiement terminé avec succès",
    },
  });

  // ✅ Replay
  await prisma.replaySession.create({
    data: {
      projectId: alpha.id,
      userId: user.id,
      dataUrl: "https://storage.uinova.dev/replays/alpha-001.json",
    },
  });

  console.log("✅ Seed terminé avec succès.");
  console.log("➡️ User:", email, "pwd: Secret123!");
}

main()
  .catch((err) => {
    console.error("❌ Erreur seed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
