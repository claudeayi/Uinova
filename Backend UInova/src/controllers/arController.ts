// src/controllers/arController.ts
import { Request, Response } from "express";
import { z } from "zod";
import * as arService from "../services/arService";
import { prisma } from "../utils/prisma";

/* ============================================================================
 *  Validation Schemas
 * ========================================================================== */
const PreviewQuerySchema = z.object({
  mode: z.enum(["mock", "live", "asset"]).default("mock"),
  format: z.enum(["glb", "usdz", "gltf", "image", "video"]).optional(),
  quality: z.enum(["low", "medium", "high"]).default("medium"),
  device: z.string().optional(), // iOS, Android, WebXR, etc.
  sceneId: z.string().optional(),
  userInput: z.string().optional(), // prompt IA
});

const GenerateSchema = z.object({
  prompt: z.string().min(3, "Prompt trop court"),
  format: z.enum(["glb", "usdz", "gltf"]).default("glb"),
  quality: z.enum(["low", "medium", "high"]).default("medium"),
});

/* ============================================================================
 *  Helpers
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
    console.error("⚠️ Audit log error:", err);
  }
}

/* ============================================================================
 *  GET /api/ar/preview
 * ========================================================================== */
export async function getARPreview(req: Request, res: Response) {
  try {
    const parsed = PreviewQuerySchema.safeParse(req.query);
    if (!parsed.success) {
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

    await logAction(user.id, "AR_PREVIEW", `Mode: ${mode}`, { format, quality, device, sceneId, userInput });
    return res.json({ success: true, mode, format, quality, device, data });
  } catch (err: any) {
    console.error("❌ getARPreview error:", err);
    return res.status(500).json({ success: false, error: "Erreur génération AR", details: err.message });
  }
}

/* ============================================================================
 *  POST /api/ar/generate
 * ========================================================================== */
export async function generateARModel(req: Request, res: Response) {
  try {
    const parsed = GenerateSchema.safeParse(req.body);
    if (!parsed.success) {
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

    await logAction(user.id, "AR_GENERATE_MODEL", prompt, { format, quality, url: result?.url });
    return res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    console.error("❌ generateARModel error:", err);
    return res.status(500).json({ success: false, error: "Erreur génération modèle AR", details: err.message });
  }
}

/* ============================================================================
 *  GET /api/ar/assets
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
    console.error("❌ listARAssets error:", err);
    return res.status(500).json({ success: false, error: "Erreur récupération assets AR", details: err.message });
  }
}

/* ============================================================================
 *  GET /api/ar/stream → SSE temps réel (rendu AR)
 * ========================================================================== */
export async function streamARRender(req: Request, res: Response) {
  try {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const user = getUser(req);
    await logAction(user.id, "AR_STREAM_START");

    // Simulation de rendu temps réel
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
  } catch (err: any) {
    console.error("❌ streamARRender error:", err);
    return res.status(500).json({ success: false, error: "Erreur stream AR", details: err.message });
  }
}
