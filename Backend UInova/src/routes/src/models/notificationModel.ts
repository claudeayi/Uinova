import prisma from '../utils/prisma';

export async function addNotification(data: { message: string; userId: number }) {
  return prisma.notification.create({ data });
}

export async function getNotificationsByUser(userId: number) {
  return prisma.notification.findMany({ where: { userId } });
}

export async function markNotificationAsRead(id: number) {
  // exemple : mettre à jour une colonne "seen" si définie dans le schéma
  return prisma.notification.update({ where: { id }, data: { seen: true } });
}

export async function deleteNotification(id: number) {
  return prisma.notification.delete({ where: { id } });
}
