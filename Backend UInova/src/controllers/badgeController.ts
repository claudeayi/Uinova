import prisma from "../utils/prisma";
import { Request, Response } from "express";

export const give = async (req: Request, res: Response) => {
  await prisma.badge.create({
    data: { type: req.body.type, userId: req.user.id }
  });
  res.json({ ok: true });
};

export const list = async (req: Request, res: Response) => {
  const badges = await prisma.badge.findMany({ where: { userId: req.user.id } });
  res.json(badges);
};
