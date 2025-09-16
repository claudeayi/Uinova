import { Request, Response } from "express";
import { z } from "zod";
import * as arService from "../services/arService";
import { prisma } from "../utils/prisma";
import { emitEvent } from "../services/eventBus";
import { logger } from "../utils/logger";
import client from "prom-client";

/* ============================================================================
 * 📊 Prometheus Metrics
 * ========================================================================== */
const counterPreview = new client.Counter({
  name: "uinova_ar_preview_total",
  help: "Nombre de previews AR générés",
});
const counterGenerate = new client.Counter({
  name: "uinova_ar_generate_total",
  help: "Nombre de modèles AR générés",
});
const counterStream = new client.Counter({
  name: "uinova_ar_stream_total",
  help: "Nombre de streams AR lancés",
});
const counterError = new client.Counter({
  name: "uinova_ar_error_total",
  help: "Nombre d'erreurs AR",
});

/* ============================================================================
 * Validation Schemas
 * ========================================================================== */
const PreviewQuerySchema = z.object({
  mode: z.enum(["mock", "live", "asset"]).default("mock"),
  format: z.enum(["glb", "usdz", "gltf", "image", "video"]).optional(),
  quality: z.enum(["low", "medium", "high"]).default("medium"),
  device: z.string().optional(),
  sceneId: z.string().optional(),
  userInput: z.string().optional(),
});

const GenerateSchema = z.object({
  prompt: z.string().min(3, "Prompt trop court"),
  format: z.enum(["glb", "usdz", "gltf"]).default("glb"),
  quality: z.enum(["low", "medium", "high"]).default("medium"),
});

/* ============================================================================
 * Helpers
 * ========================================================================== */
function getUser(req: Request) {
  return (req as any).user || { id: "anonymous", role: "GUEST" };
}

async function logAction(userId: string, action: string, details?: string, metadata?: any) {
  try {
    await prisma.auditLog.create({
      data: { userId, action, details, metadata },
    });
  } catch (err) {
    logger.warn("⚠️ Audit log error", err);
  }
}

/* ============================================================================
 * GET /api/ar/preview
 * ========================================================================== */
export async function getARPreview(req: Request, res: Response) {
  const start = Date.now();
  try {
    const parsed = PreviewQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      counterError.inc();
      return res.status(400).json({ success: false, error: parsed.error.flatten() });
    }

    const { mode, format, quality, device, sceneId, userInput } = parsed.data;
    const user = getUser(req);

    let data: any;
    switch (mode) {
      case "mock":
        data = await arService.generateMockPreview({ format, quality });
        break;
      case "live":
        data = await arService.generateLivePreview({
          userId: user.id,
          sceneId,
          device,
          format,
          quality,
        });
        break;
      case "asset":
        data = await arService.fetchARAsset({ sceneId, format });
        break;
    }

    await logAction(user.id, "AR_PREVIEW", `Mode: ${mode}`, {
      format,
      quality,
      device,
      sceneId,
      userInput,
      latency: Date.now() - start,
      ip: req.ip,
    });

    emitEvent("ar.preview", { userId: user.id, mode, format, sceneId });
    counterPreview.inc();

    return res.json({ success: true, mode, format, quality, device, data });
  } catch (err: any) {
    counterError.inc();
    logger.error("❌ getARPreview error", err);
    return res.status(500).json({ success: false, error: "Erreur génération AR", details: err.message });
  }
}

/* ============================================================================
 * POST /api/ar/generate
 * ========================================================================== */
export async function generateARModel(req: Request, res: Response) {
  const start = Date.now();
  try {
    const parsed = GenerateSchema.safeParse(req.body);
    if (!parsed.success) {
      counterError.inc();
      return res.status(400).json({ success: false, error: parsed.error.flatten() });
    }

    const { prompt, format, quality } = parsed.data;
    const user = getUser(req);

    const result = await arService.generateFromPrompt({ prompt, format, quality });

    await prisma.arAsset.create({
      data: {
        userId: user.id,
        prompt,
        format,
        quality,
        url: result?.url,
      },
    });

    await logAction(user.id, "AR_GENERATE_MODEL", prompt, {
      format,
      quality,
      url: result?.url,
      latency: Date.now() - start,
      ip: req.ip,
    });

    emitEvent("ar.generate", { userId: user.id, prompt, format });
    counterGenerate.inc();

    return res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    counterError.inc();
    logger.error("❌ generateARModel error", err);
    return res.status(500).json({ success: false, error: "Erreur génération modèle AR", details: err.message });
  }
}

/* ============================================================================
 * GET /api/ar/assets
 * ========================================================================== */
export async function listARAssets(req: Request, res: Response) {
  try {
    const user = getUser(req);
    const assets = await prisma.arAsset.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    return res.json({ success: true, data: assets });
  } catch (err: any) {
    counterError.inc();
    logger.error("❌ listARAssets error", err);
    return res.status(500).json({ success: false, error: "Erreur récupération assets AR", details: err.message });
  }
}

/* ============================================================================
 * GET /api/ar/stream → SSE temps réel
 * ========================================================================== */
export async function streamARRender(req: Request, res: Response) {
  try {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const user = getUser(req);
    await logAction(user.id, "AR_STREAM_START");
    emitEvent("ar.stream", { userId: user.id });
    counterStream.inc();

    let step = 0;
    const interval = setInterval(() => {
      step++;
      const progress = Math.min(100, step * 10);
      res.write(`data: ${JSON.stringify({ progress, status: progress === 100 ? "done" : "rendering" })}\n\n`);

      if (progress === 100) {
        clearInterval(interval);
        res.end();
        logAction(user.id, "AR_STREAM_END", undefined, { steps: step });
      }
    }, 800);

    // Heartbeat pour éviter timeouts
    const heartbeat = setInterval(() => {
      res.write(`event: heartbeat\ndata: ${Date.now()}\n\n`);
    }, 15000);

    res.on("close", () => {
      clearInterval(interval);
      clearInterval(heartbeat);
      logger.info(`👋 streamARRender closed for user=${user.id}`);
    });
  } catch (err: any) {
    counterError.inc();
    logger.error("❌ streamARRender error", err);
    return res.status(500).json({ success: false, error: "Erreur stream AR", details: err.message });
  }
}
