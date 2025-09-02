// src/controllers/apiKeyController.ts
import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { randomBytes } from "crypto";

/* ============================================================================
 * HELPERS
 * ============================================================================
 */
function generateApiKey(): string {
  // Génère une clé au format APIKEY_xxx
  return `APIKEY_${randomBytes(24).toString("hex")}`;
}

/* ============================================================================
 * CONTROLLERS
 * ============================================================================
 */

// ✅ Créer une clé API (affichée une seule fois)
export async function createApiKey(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.id) return res.status(401).json({ error: "UNAUTHORIZED" });

    const { scope = "read" } = req.body;

    const key = generateApiKey();

    const apiKey = await prisma.apiKey.create({
      data: { userId: user.id, key, scope },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "API_KEY_CREATED",
        metadata: { keyId: apiKey.id, scope },
      },
    });

    // ⚠️ La clé ne sera jamais renvoyée après !
    return res.status(201).json({
      success: true,
      message: "Clé API créée. Conservez-la précieusement, elle ne sera plus affichée.",
      apiKey: {
        id: apiKey.id,
        key, // affichage unique
        scope: apiKey.scope,
        createdAt: apiKey.createdAt,
      },
    });
  } catch (err: any) {
    console.error("❌ createApiKey error:", err);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: err.message });
  }
}

// ✅ Lister les clés API (masquées)
export async function listApiKeys(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.id) return res.status(401).json({ error: "UNAUTHORIZED" });

    const keys = await prisma.apiKey.findMany({
      where: { userId: user.id },
      select: { id: true, scope: true, active: true, createdAt: true },
    });

    return res.json({ success: true, data: keys });
  } catch (err: any) {
    console.error("❌ listApiKeys error:", err);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: err.message });
  }
}

// ✅ Révoquer une clé API
export async function revokeApiKey(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.id) return res.status(401).json({ error: "UNAUTHORIZED" });

    const { id } = req.params;

    const apiKey = await prisma.apiKey.findUnique({ where: { id } });
    if (!apiKey || apiKey.userId !== user.id) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }

    await prisma.apiKey.update({ where: { id }, data: { active: false } });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "API_KEY_REVOKED",
        metadata: { keyId: id },
      },
    });

    return res.json({ success: true, message: "Clé API révoquée." });
  } catch (err: any) {
    console.error("❌ revokeApiKey error:", err);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: err.message });
  }
}

// ✅ ADMIN : Lister toutes les clés API
export async function listAllApiKeys(req: Request, res: Response) {
  try {
    const role = (req as any).user?.role;
    if (role !== "ADMIN") return res.status(403).json({ error: "FORBIDDEN" });

    const keys = await prisma.apiKey.findMany({
      include: {
        user: { select: { id: true, email: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return res.json({
      success: true,
      total: keys.length,
      data: keys.map((k) => ({
        id: k.id,
        scope: k.scope,
        active: k.active,
        createdAt: k.createdAt,
        user: k.user,
      })),
    });
  } catch (err: any) {
    console.error("❌ listAllApiKeys error:", err);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: err.message });
  }
}
