// src/middlewares/apiKeyAuth.ts
import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prisma";

export async function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers["x-api-key"];
  if (!header || typeof header !== "string") {
    return res.status(401).json({ error: "API_KEY_REQUIRED" });
  }

  try {
    const apiKey = await prisma.apiKey.findUnique({
      where: { key: header },
      include: { user: true },
    });

    if (!apiKey || !apiKey.active) {
      return res.status(403).json({ error: "API_KEY_INVALID" });
    }

    req.user = { id: apiKey.userId, role: apiKey.user.role };
    (req as any).apiKeyScope = apiKey.scope;

    await prisma.auditLog.create({
      data: {
        userId: apiKey.userId,
        action: "API_KEY_USED",
        metadata: { keyId: apiKey.id, scope: apiKey.scope, path: req.path },
      },
    });

    next();
  } catch (err) {
    console.error("❌ apiKeyAuth error:", err);
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
}
