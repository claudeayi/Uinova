import prisma from '../utils/prisma';

export async function awardBadge(data: { type: string; userId: number }) {
  return prisma.badge.create({ data });
}

export async function getBadgesByUser(userId: number) {
  return prisma.badge.findMany({ where: { userId } });
}

export async function removeBadge(id: number) {
  return prisma.badge.delete({ where: { id } });
}
