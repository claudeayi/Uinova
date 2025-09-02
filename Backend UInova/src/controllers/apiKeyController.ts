import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import crypto from "crypto";

function generateApiKey(): string {
  return crypto.randomBytes(32).toString("hex");
}

// ✅ Créer une nouvelle API key
export async function createApiKey(req: Request, res: Response) {
  const user = (req as any).user;
  if (!user?.id) return res.status(401).json({ success: false, message: "Non autorisé" });

  const rawKey = generateApiKey();
  const apiKey = await prisma.apiKey.create({
    data: {
      userId: user.id,
      key: rawKey,
    },
  });

  res.status(201).json({
    success: true,
    key: rawKey, // ⚠️ Ne sera plus retourné après création
    data: { id: apiKey.id, active: apiKey.active, createdAt: apiKey.createdAt },
  });
}

// ✅ Lister les API keys
export async function listApiKeys(req: Request, res: Response) {
  const user = (req as any).user;
  if (!user?.id) return res.status(401).json({ success: false, message: "Non autorisé" });

  const keys = await prisma.apiKey.findMany({
    where: { userId: user.id },
    select: { id: true, active: true, createdAt: true },
  });

  res.json({ success: true, data: keys });
}

// ✅ Révoquer une API key
export async function revokeApiKey(req: Request, res: Response) {
  const { id } = req.params;
  const user = (req as any).user;

  const key = await prisma.apiKey.findUnique({ where: { id } });
  if (!key || key.userId !== user.id) {
    return res.status(404).json({ success: false, message: "Clé introuvable" });
  }

  await prisma.apiKey.update({ where: { id }, data: { active: false } });

  res.json({ success: true, message: "API key révoquée" });
}
