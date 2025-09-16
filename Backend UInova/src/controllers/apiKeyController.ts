import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { randomBytes } from "crypto";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import client from "prom-client";
import { emitEvent } from "../services/eventBus";
import { logger } from "../utils/logger";

/* ============================================================================
 * 📊 Prometheus Metrics
 * ========================================================================== */
const counterApiKeyCreated = new client.Counter({
  name: "uinova_api_keys_created_total",
  help: "Nombre de clés API créées",
});
const counterApiKeyRevoked = new client.Counter({
  name: "uinova_api_keys_revoked_total",
  help: "Nombre de clés API révoquées",
});

/* ============================================================================
 * CONFIG & HELPERS
 * ========================================================================== */
function generateApiKey(): string {
  return `APIKEY_${randomBytes(32).toString("hex")}`;
}

const ScopeSchema = z.enum(["read", "write", "admin"]);
const CreateApiKeySchema = z.object({
  scope: ScopeSchema.default("read"),
  description: z.string().max(200).optional(),
});

function getUser(req: Request) {
  return (req as any).user || null;
}

/* ============================================================================
 * CONTROLLERS
 * ========================================================================== */

// ✅ Créer une clé API (affichée une seule fois)
export async function createApiKey(req: Request, res: Response) {
  const requestId = uuid();
  const start = Date.now();
  try {
    const user = getUser(req);
    if (!user?.id) {
      return res.status(401).json({ success: false, error: "UNAUTHORIZED", requestId });
    }

    const parsed = CreateApiKeySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: "INVALID_BODY",
        details: parsed.error.flatten(),
        requestId,
      });
    }
    const { scope, description } = parsed.data;

    const key = generateApiKey();
    const apiKey = await prisma.apiKey.create({
      data: {
        userId: user.id,
        key,
        scope,
        description,
        active: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "API_KEY_CREATED",
        metadata: {
          keyId: apiKey.id,
          scope,
          description,
          ip: req.ip,
          ua: req.headers["user-agent"],
          latency: Date.now() - start,
        },
      },
    });

    counterApiKeyCreated.inc();
    emitEvent("apiKey.created", { userId: user.id, keyId: apiKey.id, scope });

    return res.status(201).json({
      success: true,
      requestId,
      message: "Clé API créée. Conservez-la précieusement, elle ne sera plus affichée.",
      apiKey: {
        id: apiKey.id,
        key, // affichage unique
        scope: apiKey.scope,
        description: apiKey.description,
        createdAt: apiKey.createdAt,
      },
    });
  } catch (err: any) {
    logger.error("❌ createApiKey error", err);
    return res.status(500).json({
      success: false,
      error: "INTERNAL_ERROR",
      message: err.message,
      requestId,
    });
  }
}

// ✅ Lister ses clés API (masquées)
export async function listApiKeys(req: Request, res: Response) {
  const requestId = uuid();
  try {
    const user = getUser(req);
    if (!user?.id) return res.status(401).json({ success: false, error: "UNAUTHORIZED", requestId });

    const keys = await prisma.apiKey.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        scope: true,
        description: true,
        active: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ success: true, requestId, data: keys });
  } catch (err: any) {
    logger.error("❌ listApiKeys error", err);
    return res.status(500).json({ success: false, error: "INTERNAL_ERROR", message: err.message, requestId });
  }
}

// ✅ Révoquer une clé API
export async function revokeApiKey(req: Request, res: Response) {
  const requestId = uuid();
  const start = Date.now();
  try {
    const user = getUser(req);
    if (!user?.id) return res.status(401).json({ success: false, error: "UNAUTHORIZED", requestId });

    const { id } = req.params;
    const apiKey = await prisma.apiKey.findUnique({ where: { id } });

    if (!apiKey || apiKey.userId !== user.id) {
      return res.status(404).json({ success: false, error: "NOT_FOUND", requestId });
    }

    if (!apiKey.active) {
      return res.status(400).json({ success: false, error: "ALREADY_REVOKED", requestId });
    }

    await prisma.apiKey.update({ where: { id }, data: { active: false } });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "API_KEY_REVOKED",
        metadata: {
          keyId: id,
          ip: req.ip,
          ua: req.headers["user-agent"],
          latency: Date.now() - start,
        },
      },
    });

    counterApiKeyRevoked.inc();
    emitEvent("apiKey.revoked", { userId: user.id, keyId: id });

    return res.json({ success: true, requestId, message: "Clé API révoquée avec succès." });
  } catch (err: any) {
    logger.error("❌ revokeApiKey error", err);
    return res.status(500).json({ success: false, error: "INTERNAL_ERROR", message: err.message, requestId });
  }
}

// ✅ ADMIN : Lister toutes les clés API (avec pagination + filtres)
export async function listAllApiKeys(req: Request, res: Response) {
  const requestId = uuid();
  try {
    const role = (req as any).user?.role;
    if (role !== "ADMIN") return res.status(403).json({ success: false, error: "FORBIDDEN", requestId });

    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (req.query.userId) where.userId = String(req.query.userId);
    if (req.query.scope) where.scope = String(req.query.scope);
    if (req.query.active !== undefined) where.active = req.query.active === "true";

    const [total, keys] = await Promise.all([
      prisma.apiKey.count({ where }),
      prisma.apiKey.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
    ]);

    return res.json({
      success: true,
      requestId,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      data: keys.map((k) => ({
        id: k.id,
        scope: k.scope,
        description: k.description,
        active: k.active,
        createdAt: k.createdAt,
        user: k.user,
      })),
    });
  } catch (err: any) {
    logger.error("❌ listAllApiKeys error", err);
    return res.status(500).json({ success: false, error: "INTERNAL_ERROR", message: err.message, requestId });
  }
}
