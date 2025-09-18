// src/services/generateMockPreview.ts
import { logger } from "../utils/logger";
import { auditLog } from "./auditLogService";
import { emitEvent } from "./eventBus";
import { metrics } from "../utils/metrics";
import { z } from "zod";

/* ============================================================================
 * Types
 * ========================================================================== */
export interface ARMarker {
  id: string;
  x: number;
  y: number;
  z: number;
  rotation?: { x: number; y: number; z: number };
  scale?: number;
  meta?: Record<string, any>;
}

export interface ARPreview {
  modelUrl: string;
  format: "glb" | "usdz" | "fbx";
  markers: ARMarker[];
  environment: {
    hdri: string;
    lightIntensity: number;
    shadows: boolean;
  };
  createdAt: number;
}

/* ============================================================================
 * Zod Schemas
 * ========================================================================== */
const arMarkerSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  z: z.number(),
  rotation: z
    .object({
      x: z.number(),
      y: z.number(),
      z: z.number(),
    })
    .optional(),
  scale: z.number().optional(),
  meta: z.record(z.any()).optional(),
});

const arPreviewSchema = z.object({
  modelUrl: z.string().url(),
  format: z.enum(["glb", "usdz", "fbx"]),
  markers: z.array(arMarkerSchema),
  environment: z.object({
    hdri: z.string().url(),
    lightIntensity: z.number(),
    shadows: z.boolean(),
  }),
  createdAt: z.number(),
});

export interface MockPreviewOptions {
  format?: "glb" | "usdz" | "fbx";
  markerCount?: number;
  userId?: string;
}

/* ============================================================================
 * Génération d’un mock AR Preview
 * ========================================================================== */
export async function generateMockPreview(
  options: MockPreviewOptions = {}
): Promise<ARPreview> {
  logger.info("🔮 Generating mock AR preview...");

  const { format = "glb", markerCount = 3, userId } = options;

  try {
    const markers: ARMarker[] = Array.from({ length: markerCount }).map((_, i) => ({
      id: String(i + 1),
      x: parseFloat((Math.random() * 2 - 1).toFixed(2)),
      y: parseFloat((Math.random() * 2 - 1).toFixed(2)),
      z: parseFloat((Math.random() * 2 - 1).toFixed(2)),
      rotation: {
        x: Math.floor(Math.random() * 360),
        y: Math.floor(Math.random() * 360),
        z: Math.floor(Math.random() * 360),
      },
      scale: parseFloat((0.5 + Math.random() * 1.5).toFixed(2)),
      meta: { note: `Marker auto-généré #${i + 1}` },
    }));

    const preview: ARPreview = {
      modelUrl: `https://cdn.uinova.com/mock-model.${format}`,
      format,
      markers,
      environment: {
        hdri: "https://cdn.uinova.com/env/default.hdr",
        lightIntensity: 1 + Math.random(),
        shadows: true,
      },
      createdAt: Date.now(),
    };

    const parsed = arPreviewSchema.parse(preview);

    // Logs & monitoring
    metrics.arPreviewGenerated.inc();
    await auditLog.log(userId || "system", "AR_PREVIEW_GENERATED", {
      format,
      markerCount,
    });
    emitEvent("ar.preview.generated", { userId, format, markerCount });

    return parsed;
  } catch (err: any) {
    logger.error("❌ generateMockPreview error", err?.message);
    metrics.arPreviewGenerated.inc({ status: "error" });

    return {
      modelUrl: "https://cdn.uinova.com/fallback-model.glb",
      format: "glb",
      markers: [],
      environment: {
        hdri: "https://cdn.uinova.com/env/default.hdr",
        lightIntensity: 1,
        shadows: false,
      },
      createdAt: Date.now(),
    };
  }
}
