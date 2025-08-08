import prisma from '../utils/prisma';

export async function getPagesByProject(projectId: number) {
  return prisma.page.findMany({ where: { projectId } });
}

export async function getPageById(id: number) {
  return prisma.page.findUnique({ where: { id } });
}

export async function createPage(data: { name: string; data: any; projectId: number }) {
  return prisma.page.create({ data });
}

export async function updatePage(id: number, data: Partial<{ name: string; data: any }>) {
  return prisma.page.update({ where: { id }, data });
}

export async function deletePage(id: number) {
  return prisma.page.delete({ where: { id } });
}
