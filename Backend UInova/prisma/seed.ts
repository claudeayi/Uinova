import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main(){
  const email = "john.doe@uinova.dev";
  const user = await prisma.user.upsert({
    where: { email }, update: {},
    create: { email, passwordHash: "$2a$10$W2Hk3o5dJx3s4vW1Q0JROuu7oYoG0nHnF9r8n9aFZlI0k1aC6wqGi", displayName: "John Doe" }
    // hash = "Secret123!"  (dev uniquement)
  });

  await prisma.project.deleteMany({ where: { ownerId: user.id } });

  await prisma.project.createMany({
    data: [
      { ownerId: user.id, name: "Projet Alpha", tagline: "Application web moderne avec React et Node.js", icon: "📱", status: "IN_PROGRESS" },
      { ownerId: user.id, name: "Projet Bêta",  tagline: "Interface utilisateur mobile avec Flutter",    icon: "🎨", status: "DONE" },
      { ownerId: user.id, name: "Projet Gamma", tagline: "Système de gestion de contenu CMS",            icon: "⚡", status: "PLANNED" }
    ]
  });

  console.log("Seed ok. User:", email, "pwd: Secret123!");
}
main().finally(()=>prisma.$disconnect());
