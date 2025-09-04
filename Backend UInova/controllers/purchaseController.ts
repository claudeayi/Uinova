import { Request, Response } from "express";
import { prisma } from "../utils/prisma";

export async function listPurchases(req: Request, res: Response) {
  const userId = req.user.id;
  const purchases = await prisma.purchase.findMany({
    where: { buyerId: userId },
    include: { item: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(purchases);
}
