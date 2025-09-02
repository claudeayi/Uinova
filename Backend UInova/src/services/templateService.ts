import { prisma } from "../utils/prisma";

export async function listTemplates() {
  return prisma.marketplaceItem.findMany({ where: { type: "template" } });
}

export async function getTemplate(id: string) {
  return prisma.marketplaceItem.findUnique({ where: { id } });
}

export async function createTemplate(data: { name: string; description: string; price: number; json: any }) {
  return prisma.marketplaceItem.create({
    data: {
      name: data.name,
      description: data.description,
      price: data.price,
      type: "template",
      content: data.json,
    },
  });
}
