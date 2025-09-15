// src/services/generateMockPreview.ts
import { logger } from "../utils/logger";

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

/**
 * Génère un mock d’aperçu AR (multi-plateformes).
 * ⚡ Peut être remplacé par une génération IA (via AIOrchestrator).
 */
export async function generateMockPreview(): Promise<ARPreview> {
  logger.info("🔮 Generating mock AR preview...");

  return {
    modelUrl: "https://cdn.uinova.com/mock-model.glb",
    format: "glb",
    markers: [
      { id: "1", x: 0, y: 0, z: 0, rotation: { x: 0, y: 0, z: 0 }, scale: 1 },
      { id: "2", x: 1, y: 1, z: 1, rotation: { x: 0, y: 45, z: 0 }, scale: 1.2 },
      {
        id: "3",
        x: -1,
        y: 0.5,
        z: 2,
        rotation: { x: 15, y: 0, z: 0 },
        scale: 0.8,
        meta: { note: "Exemple d’annotation AR" },
      },
    ],
    environment: {
      hdri: "https://cdn.uinova.com/env/default.hdr",
      lightIntensity: 1.2,
      shadows: true,
    },
    createdAt: Date.now(),
  };
}
