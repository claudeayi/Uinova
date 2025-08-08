import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { hashPassword, comparePassword } from "../utils/hash";
import { signToken } from "../utils/jwt";

export const register = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) return res.status(409).json({ message: "User exists" });
  const hashed = await hashPassword(password);
  const newUser = await prisma.user.create({
    data: { email, password: hashed }
  });
  const token = signToken({ id: newUser.id, email, role: newUser.role });
  res.status(201).json({ token });
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await comparePassword(password, user.password))) {
    return res.status(401).json({ message: "Invalid" });
  }
  const token = signToken({ id: user.id, email, role: user.role });
  res.json({ token });
};

export const me = async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { id: true, email: true, role: true } });
  res.json(user);
};
