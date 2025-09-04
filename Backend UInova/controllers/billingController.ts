import { Request, Response } from "express";
import { prisma } from "../utils/prisma";

export async function getUsageReport(req: Request, res: Response) {
  const userId = req.user.id;

  const api = await prisma.usageRecord.count({ where: { userId, type: "api_call" } });
  const storage = await prisma.usageRecord.aggregate({
    _sum: { amount: true },
    where: { userId, type: "storage" },
  });
  const projects = await prisma.project.count({ where: { ownerId: userId } });

  res.json({
    api,
    storageMB: storage._sum.amount || 0,
    projects,
  });
}

export async function getUsageHistory(req: Request, res: Response) {
  const userId = req.user.id;
  const history = await prisma.usageHistory.findMany({
    where: { userId },
    orderBy: { date: "asc" },
  });
  res.json(history);
}
