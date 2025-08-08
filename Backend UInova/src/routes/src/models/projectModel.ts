import prisma from '../utils/prisma';

export async function getProjectsByUser(userId: number) {
  return prisma.project.findMany({ where: { userId } });
}

export async function getProjectById(id: number) {
  return prisma.project.findUnique({ where: { id } });
}

export async function createProject(data: { name: string; userId: number }) {
  return prisma.project.create({ data });
}

export async function updateProject(id: number, data: Partial<{ name: string }>) {
  return prisma.project.update({ where: { id }, data });
}

export async function deleteProject(id: number) {
  return prisma.project.delete({ where: { id } });
}
