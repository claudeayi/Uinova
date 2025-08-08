import prisma from "../utils/prisma";
import { Request, Response } from "express";

export const notify = async (req: Request, res: Response) => {
  await prisma.notification.create({
    data: { message: req.body.message, userId: req.user.id }
  });
  res.json({ ok: true });
};

export const list = async (req: Request, res: Response) => {
  const notifs = await prisma.notification.findMany({ where: { userId: req.user.id } });
  res.json(notifs);
};
