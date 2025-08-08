import prisma from "../utils/prisma";
import { Request, Response } from "express";

export const listUsers = async (req: Request, res: Response) => {
  const users = await prisma.user.findMany({ select: { id: true, email: true, role: true, createdAt: true } });
  res.json(users);
};

export const deleteUser = async (req: Request, res: Response) => {
  await prisma.user.delete({ where: { id: +req.params.id } });
  res.json({ message: "User deleted" });
};
