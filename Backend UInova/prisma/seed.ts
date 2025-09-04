import {
  PrismaClient,
  UserRole,
  ProjectStatus,
  SubscriptionPlan,
  SubscriptionStatus,
  PaymentProvider,
  PaymentStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

/* ============================================================================
 * Helper pour steps compressés (mock JSON compressé → Buffer)
 * ========================================================================== */
function mockStepsCompressed(steps: any[]): Buffer {
  const json = JSON.stringify(steps);
  return Buffer.from(json, "utf-8"); // en prod → compresser avec gzip/gzipSync
}

async function main() {
  /* ============================================================================
   * USER PREMIUM (John Doe)
   * ========================================================================== */
  const email = "john.doe@uinova.dev";

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash:
        "$2a$10$W2Hk3o5dJx3s4vW1Q0JROuu7oYoG0nHnF9r8n9aFZlI0k1aC6wqGi", // "Secret123!"
      name: "John Doe",
      role: UserRole.PREMIUM,
      avatarUrl: "https://i.pravatar.cc/150?u=john",
    },
  });

  // Nettoyage projets existants
  await prisma.project.deleteMany({ where: { ownerId: user.id } });

  const [alpha] = await prisma.$transaction([
    prisma.project.create({
      data: {
        ownerId: user.id,
        name: "Projet Alpha",
        description: "Application web moderne avec React et Node.js",
        status: ProjectStatus.EN_COURS,
        pages: {
          create: [{ name: "Home", schemaJSON: { type: "page", elements: [] } }],
        },
      },
    }),
  ]);

  /* ============================================================================
   * SUBSCRIPTION + PAYMENT
   * ========================================================================== */
  const subscription = await prisma.subscription.create({
    data: {
      userId: user.id,
      plan: SubscriptionPlan.PRO,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.payment.create({
    data: {
      provider: PaymentProvider.STRIPE,
      providerRef: "pi_1234567890",
      amountCents: 4900,
      currency: "EUR",
      status: PaymentStatus.SUCCEEDED,
      userId: user.id,
      subscriptionId: subscription.id,
      projectId: alpha.id,
    },
  });

  // ➕ Historique d’usage
  await prisma.usageRecord.createMany({
    data: [
      { userId: user.id, projectId: alpha.id, type: "api_call", amount: 120 },
      { userId: user.id, projectId: alpha.id, type: "ai_tokens", amount: 2500 },
      { userId: user.id, projectId: alpha.id, type: "storage", amount: 35 },
    ],
  });

  /* ============================================================================
   * NOTIFICATIONS
   * ========================================================================== */
  await prisma.notification.createMany({
    data: [
      {
        userId: user.id,
        type: "info",
        title: "Bienvenue 🎉",
        body: "Merci d’avoir rejoint UInova !",
        actionUrl: "https://app.uinova.dev/dashboard",
        meta: { onboarding: true },
      },
      {
        userId: user.id,
        type: "warning",
        title: "Quota",
        body: "Vous avez atteint 80% de votre quota d’assets.",
        meta: { usage: 0.8, limit: "assets" },
      },
    ],
  });

  /* ============================================================================
   * BADGE
   * ========================================================================== */
  const badge = await prisma.badge.upsert({
    where: { code: "EARLY_ADOPTER" },
    update: {},
    create: { code: "EARLY_ADOPTER", label: "Early Adopter 🚀", icon: "🌟" },
  });

  await prisma.userBadge.upsert({
    where: { userId_badgeId: { userId: user.id, badgeId: badge.id } },
    update: {},
    create: { userId: user.id, badgeId: badge.id, meta: { reason: "First wave" } },
  });

  /* ============================================================================
   * MARKETPLACE + FAVORITES
   * ========================================================================== */
  const template = await prisma.marketplaceItem.create({
    data: {
      title: "Template Portfolio",
      description: "Portfolio moderne pour freelances",
      priceCents: 1900,
      ownerId: user.id,
    },
  });

  // Achat
  await prisma.purchase.create({
    data: { itemId: template.id, buyerId: user.id },
  });

  // Favori
  await prisma.favorite.create({
    data: { userId: user.id, itemId: template.id },
  });

  /* ============================================================================
   * DEPLOYMENT
   * ========================================================================== */
  await prisma.deployment.create({
    data: {
      projectId: alpha.id,
      status: "SUCCESS",
      targetUrl: "https://alpha.uinova.dev",
      logs: "Déploiement terminé avec succès",
    },
  });

  /* ============================================================================
   * MOCK REPLAYS
   * ========================================================================== */
  const steps = [
    { userId: user.id, at: new Date(), changes: { add: "Button" }, snapshot: { elements: ["Button"] } },
    { userId: user.id, at: new Date(), changes: { add: "Text: Hello" }, snapshot: { elements: ["Button", "Text"] } },
    { userId: user.id, at: new Date(), changes: { update: "Button color=blue" }, snapshot: { elements: ["Button(blue)", "Text"] } },
  ];

  await prisma.replaySession.create({
    data: {
      projectId: alpha.id,
      userId: user.id,
      dataUrl: "https://storage.uinova.dev/replays/alpha-001.json",
      snapshot: steps[steps.length - 1].snapshot,
      stepsCompressed: mockStepsCompressed(steps),
      meta: { totalSteps: steps.length, users: [user.id], durationMs: 2400 },
      startedAt: new Date(Date.now() - 3000),
      endedAt: new Date(),
    },
  });

  /* ============================================================================
   * ADMIN USER
   * ========================================================================== */
  const adminEmail = "admin@uinova.dev";
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash:
        "$2a$10$W2Hk3o5dJx3s4vW1Q0JROuu7oYoG0nHnF9r8n9aFZlI0k1aC6wqGi", // "Secret123!"
      name: "Admin UInova",
      role: UserRole.ADMIN,
      avatarUrl: "https://i.pravatar.cc/150?u=admin",
    },
  });

  await prisma.notification.create({
    data: {
      userId: admin.id,
      type: "info",
      title: "Cockpit prêt 🚀",
      body: "Bienvenue dans l’espace administrateur d’UInova",
      meta: { cockpit: true },
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: "ADMIN_SEED",
      metadata: { init: true, message: "Compte admin créé via seed" },
    },
  });

  console.log("✅ Seed terminé avec succès.");
  console.log("➡️ User Premium:", email, "pwd: Secret123!");
  console.log("➡️ Admin Cockpit:", adminEmail, "pwd: Secret123!");
}

main()
  .catch((err) => {
    console.error("❌ Erreur seed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
