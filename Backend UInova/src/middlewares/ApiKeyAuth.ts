// src/middlewares/apiKeyAuth.ts
import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prisma";

/**
 * Middleware d’authentification par clé API
 * - Vérifie l’existence, la validité et l’expiration
 * - Attache l’utilisateur et le scope dans req.user et req.apiKeyScope
 * - Journalise les utilisations en base (auditLog)
 */
export async function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers["x-api-key"];
  if (!header || typeof header !== "string") {
    return res.status(401).json({ error: "API_KEY_REQUIRED" });
  }

  try {
    // Vérifie format (optionnel mais recommandé)
    if (!header.startsWith("APIKEY_")) {
      await logAttempt(null, req, false, "INVALID_FORMAT");
      return res.status(403).json({ error: "API_KEY_INVALID" });
    }

    // Recherche clé en base
    const apiKey = await prisma.apiKey.findUnique({
      where: { key: header },
      include: { user: true },
    });

    if (!apiKey || !apiKey.active) {
      await logAttempt(apiKey?.id || null, req, false, "NOT_FOUND_OR_INACTIVE");
      return res.status(403).json({ error: "API_KEY_INVALID" });
    }

    // Vérifie expiration (si champ expiresAt présent dans ton modèle)
    if ((apiKey as any).expiresAt && (apiKey as any).expiresAt < new Date()) {
      await logAttempt(apiKey.id, req, false, "EXPIRED");
      return res.status(403).json({ error: "API_KEY_EXPIRED" });
    }

    // Vérifie whitelist IP (optionnel)
    if ((apiKey as any).allowedIps && Array.isArray((apiKey as any).allowedIps)) {
      const clientIp = req.ip;
      if (!(apiKey as any).allowedIps.includes(clientIp)) {
        await logAttempt(apiKey.id, req, false, "IP_NOT_ALLOWED");
        return res.status(403).json({ error: "API_KEY_RESTRICTED" });
      }
    }

    // ✅ Attache user + scope dans la requête
    (req as any).user = { id: apiKey.userId, role: apiKey.user.role };
    (req as any).apiKeyScope = apiKey.scope;

    await logAttempt(apiKey.id, req, true);

    next();
  } catch (err: any) {
    console.error("❌ apiKeyAuth error:", err);
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
}

/**
 * Journalisation des tentatives d’usage de clé API
 */
async function logAttempt(
  keyId: string | null,
  req: Request,
  success: boolean,
  reason?: string
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: (req as any)?.user?.id || null,
        action: success ? "API_KEY_USED" : "API_KEY_DENIED",
        metadata: {
          keyId,
          scope: (req as any).apiKeyScope || null,
          path: req.originalUrl,
          method: req.method,
          ip: req.ip,
          reason: reason || null,
        },
      },
    });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.error("❌ auditLog (apiKeyAuth) error:", (e as any).message);
    }
  }
}
