import prisma from '../utils/prisma';

export async function getAllUsers() {
  return prisma.user.findMany();
}

export async function getUserById(id: number) {
  return prisma.user.findUnique({ where: { id } });
}

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export async function createUser(data: { email: string; password: string; role?: string }) {
  return prisma.user.create({ data });
}

export async function updateUser(id: number, data: Partial<{ email: string; password: string; role: string }>) {
  return prisma.user.update({ where: { id }, data });
}

export async function deleteUser(id: number) {
  return prisma.user.delete({ where: { id } });
}
